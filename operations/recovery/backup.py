#!/usr/bin/env python3
"""Daily, self-contained encrypted media backups. Writer has no cloud read/delete access.

Source media is cached as individually sealed files; unchanged media is never
downloaded again. Every daily media archive is complete, so Azure can expire
each daily object independently. The private decryption key is never online.
"""
import base64,concurrent.futures,datetime,fcntl,hashlib,http.client,json,os
from pathlib import Path
import shutil,subprocess,tarfile,tempfile,time,urllib.parse,urllib.request
import xml.etree.ElementTree as ET
import seal

BASE=Path('/var/lib/ustw-recovery');CONFIG=Path('/etc/ustw-recovery/config.json')
MAX_MEDIA=800_000_000;MAX_FILES=4000
MAX_DAILY_DOWNLOAD=100_000_000;MAX_MONTHLY_DOWNLOAD=5_000_000_000
MAX_UPLOAD=830_000_000

def atomic(path,value):
    path=Path(path);temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(value,indent=2)+'\n');temporary.chmod(0o600);os.replace(temporary,path)

def permitted_url(url):
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname!='ustwcmsstorage.blob.core.windows.net' or parsed.username or parsed.password or parsed.fragment:raise RuntimeError('Unapproved storage origin')
    return parsed

def url_for(container_url,name='',query=None):
    parsed=permitted_url(container_url)
    suffix=('/'+urllib.parse.quote(name,safe='/')) if name else ''
    extra=urllib.parse.urlencode(query or {})
    return urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path+suffix,parsed.query+('&'+extra if extra else ''),''))

def listing(url):
    marker='';rows=[]
    while True:
        request=urllib.request.Request(url_for(url,query={'restype':'container','comp':'list','include':'metadata','maxresults':'5000','marker':marker}),headers={'x-ms-version':'2023-11-03'})
        with urllib.request.urlopen(request,timeout=60) as response:xml=response.read(16*1024*1024)
        root=ET.fromstring(xml)
        for blob in root.findall('./Blobs/Blob'):
            props={x.tag:x.text for x in blob.find('Properties')}
            rows.append({'name':blob.findtext('Name'),'bytes':int(props['Content-Length']),'etag':'"'+props['Etag'].strip('"')+'"','properties':props,'metadata':{x.tag:x.text for x in blob.find('Metadata') or []}})
            if len(rows)>MAX_FILES:raise RuntimeError('Media file-count guard exceeded')
        marker=root.findtext('NextMarker')
        if not marker:return rows

def cache_id(container,name,etag):return hashlib.sha256((container+'\0'+name+'\0'+etag).encode()).hexdigest()

def guard(rows,missing,monthly,initial):
    total=sum(r['bytes'] for r in rows);download=sum(r['bytes'] for r in missing)
    if len(rows)>MAX_FILES or total>MAX_MEDIA or any(r['bytes']<0 for r in rows):raise RuntimeError('Media size/count guard exceeded')
    if download>(MAX_MEDIA if initial else MAX_DAILY_DOWNLOAD):raise RuntimeError('Daily source-download budget guard exceeded')
    if monthly+download>MAX_MONTHLY_DOWNLOAD:raise RuntimeError('Monthly source-download budget guard exceeded')
    return download

def upload(url,name,path):
    """One create-only Put Blob. Azure validates Content-MD5 before acknowledging."""
    if path.stat().st_size>MAX_UPLOAD:raise RuntimeError('Upload size guard exceeded')
    parsed=permitted_url(url_for(url,name));digest=hashlib.md5()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
    connection=http.client.HTTPSConnection(parsed.hostname,timeout=180)
    try:
        headers={'x-ms-version':'2023-11-03','x-ms-blob-type':'BlockBlob','Content-Type':'application/octet-stream','Content-Length':str(path.stat().st_size),'Content-MD5':base64.b64encode(digest.digest()).decode(),'If-None-Match':'*'}
        with path.open('rb') as stream:connection.request('PUT',parsed.path+'?'+parsed.query,body=stream,headers=headers)
        response=connection.getresponse();response.read(1024)
        if response.status!=201:raise RuntimeError('Backup storage did not acknowledge creation: '+str(response.status))
        return {'name':name,'bytes':path.stat().st_size,'sha256':seal.sha256(path),'azureAcknowledged':True,'contentMD5Validated':True,'contentMD5':base64.b64encode(digest.digest()).decode()}
    finally:connection.close()

def obtain(row,source,cache,cert,work):
    identity=cache_id(row['container'],row['name'],row['etag']);sealed=cache/(identity+'.cms');info=cache/(identity+'.json')
    if sealed.exists() and info.exists():
        saved=json.loads(info.read_text())
        if saved['encryptedSHA256']!=seal.sha256(sealed):raise RuntimeError('Encrypted cache checksum differs')
        return {**row,**saved,'localFile':'files/'+identity+'.cms'}
    plain=work/(identity+'.download')
    try:
        request=urllib.request.Request(url_for(source,row['name']),headers={'If-Match':row['etag'],'x-ms-version':'2023-11-03'})
        digest=hashlib.sha256();size=0
        with urllib.request.urlopen(request,timeout=90) as response,plain.open('xb') as destination:
            if response.headers.get('ETag')!=row['etag']:raise RuntimeError('Source media changed during download')
            while True:
                chunk=response.read(1024*1024)
                if not chunk:break
                size+=len(chunk)
                if size>row['bytes']:raise RuntimeError('Source media size changed')
                digest.update(chunk);destination.write(chunk)
        if size!=row['bytes']:raise RuntimeError('Source media download incomplete')
        encrypted=seal.transform(plain,sealed,cert)
        saved={'sha256':digest.hexdigest(),'encryptedSHA256':encrypted['sha256']}
        atomic(info,saved);return {**row,**saved,'localFile':'files/'+identity+'.cms'}
    finally:plain.unlink(missing_ok=True)

def backup(config,now=None):
    now=now or datetime.datetime.now(datetime.timezone.utc);stamp=now.strftime('%Y%m%dT%H%M%SZ');day=now.strftime('%Y-%m-%d');month=now.strftime('%Y-%m')
    cert=Path(config['recipientCertificate']);cache=BASE/'cache';cache.mkdir(mode=0o700,exist_ok=True)
    status_path=BASE/'status.json';previous=json.loads(status_path.read_text()) if status_path.exists() else {}
    if previous.get('ok') and previous.get('scope')=='media' and previous.get('day')==day:return previous
    if config['credentialExpiresEpoch']-time.time()<30*86400:raise RuntimeError('Storage credentials require renewal within 30 days')
    usage_path=BASE/'download-usage.json';usage=json.loads(usage_path.read_text()) if usage_path.exists() else {}
    used=usage.get('bytes',0) if usage.get('month')==month else 0
    sources=config['mediaSources'];rows=[]
    for container,url in sorted(sources.items()):rows.extend({**r,'container':container} for r in listing(url))
    rows.sort(key=lambda r:(r['container'],r['name']))
    missing=[r for r in rows if not (cache/(cache_id(r['container'],r['name'],r['etag'])+'.json')).exists() or not (cache/(cache_id(r['container'],r['name'],r['etag'])+'.cms')).exists()]
    download=guard(rows,missing,used,not previous.get('lastSuccessEpoch'))
    # Reserve before fetching. Failed attempts cannot silently consume unbounded egress.
    atomic(usage_path,{'month':month,'bytes':used+download})
    if shutil.disk_usage(BASE).free<3_000_000_000:raise RuntimeError('Insufficient protected backup workspace')
    with tempfile.TemporaryDirectory(prefix='work-',dir=BASE) as folder:
        work=Path(folder)
        records=[]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futures=[pool.submit(obtain,row,sources[row['container']],cache,cert,work) for row in rows]
            for future in futures:records.append(future.result())
        # Detect membership, properties, metadata or content changes during the snapshot.
        after=[]
        for container,url in sorted(sources.items()):after.extend({**r,'container':container} for r in listing(url))
        if sorted(after,key=lambda r:(r['container'],r['name']))!=rows:raise RuntimeError('Media source changed during backup; next scheduled run must retry')
        manifest=work/'manifest.json';atomic(manifest,{'version':1,'createdAt':now.isoformat(),'format':'Each files/*.cms requires CMS decryption with recipient private key','files':records})
        media_tar=work/'media.tar'
        with tarfile.open(media_tar,'x',format=tarfile.PAX_FORMAT) as tar:
            tar.add(manifest,arcname='manifest.json',recursive=False)
            for row in records:tar.add(cache/Path(row['localFile']).name,arcname=row['localFile'],recursive=False)
        media_enc=work/'media.tar.cms';seal.transform(media_tar,media_enc,cert);media_tar.unlink()
        prefix='daily/'+stamp+'/'
        receipts=[upload(config['backupContainer'],prefix+'media.tar.cms',media_enc)]
        summary=work/'receipt.json';atomic(summary,{'version':1,'scope':'media','createdAt':now.isoformat(),'recipientCertificateSHA256':seal.sha256(cert),'files':receipts,'mediaFiles':len(rows),'mediaBytes':sum(r['bytes'] for r in rows)})
        summary_enc=work/'receipt.json.cms';seal.transform(summary,summary_enc,cert);receipts.append(upload(config['backupContainer'],prefix+'receipt.json.cms',summary_enc))
    live={cache_id(r['container'],r['name'],r['etag']) for r in rows}
    for item in cache.iterdir():
        if item.is_file() and item.suffix in ('.cms','.json') and item.stem not in live:item.unlink()
    status={'ok':True,'scope':'media','day':day,'checkedAtEpoch':int(time.time()),'lastSuccessEpoch':int(time.time()),'mediaFiles':len(rows),'mediaBytes':sum(r['bytes'] for r in rows),'downloadedBytes':download,'monthlySourceDownloadedBytes':used+download,'cloudFiles':receipts,'credentialExpiresEpoch':config['credentialExpiresEpoch']}
    atomic(status_path,status);return status

def main():
    os.umask(0o077);BASE.mkdir(mode=0o700,parents=True,exist_ok=True)
    with (BASE/'lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        for leftover in BASE.glob('work-*'):
            if leftover.is_dir() and not leftover.is_symlink():shutil.rmtree(leftover)
        config=json.loads(CONFIG.read_text())
        try:
            status=backup(config);print(json.dumps({'backupComplete':True,'mediaFiles':status['mediaFiles'],'mediaBytes':status['mediaBytes'],'downloadedBytes':status['downloadedBytes']}))
        except Exception as error:
            path=BASE/'status.json';previous=json.loads(path.read_text()) if path.exists() else {}
            atomic(path,{'ok':False,'checkedAtEpoch':int(time.time()),'lastSuccessEpoch':previous.get('lastSuccessEpoch'),'credentialExpiresEpoch':config['credentialExpiresEpoch'],'errorType':type(error).__name__})
            # Never print exceptions containing SAS URLs, names, or private data.
            print(json.dumps({'backupComplete':False,'errorType':type(error).__name__}));raise SystemExit(1)

if __name__=='__main__':main()
