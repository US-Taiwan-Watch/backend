#!/usr/bin/env python3
"""Restore a daily encrypted media archive into a NEW private local directory.

All output filenames are opaque hashes. Original container names, filenames and
HTTP metadata are retained in manifest.json; they are never used as local paths.
"""
import argparse,hashlib,json,os,re,tarfile,tempfile
from pathlib import Path
import seal

def restore(archive,output,certificate,key):
    output=Path(output);output.mkdir(mode=0o700,parents=False,exist_ok=False)
    count=0;size=0
    try:
        with tempfile.TemporaryDirectory(prefix='.restore-',dir=output.parent) as folder:
            work=Path(folder);plain=work/'media.tar';seal.transform(archive,plain,certificate,key)
            with tarfile.open(plain,'r') as tar:
                members=tar.getmembers();names=[m.name for m in members]
                if len(names)!=len(set(names)) or any(not m.isfile() for m in members) or names.count('manifest.json')!=1:raise RuntimeError('Invalid media recovery archive')
                member=tar.getmember('manifest.json')
                if member.size>16*1024*1024:raise RuntimeError('Manifest size limit exceeded')
                manifest=json.load(tar.extractfile(member));rows=manifest['files']
                if manifest['version']!=1 or len(rows)>4000:raise RuntimeError('Unsupported media archive')
                allowed={'manifest.json',*(r['localFile'] for r in rows)}
                if set(names)!=allowed or len(allowed)!=len(rows)+1:raise RuntimeError('Media manifest does not match archive')
                for row in rows:
                    if not re.fullmatch(r'files/[0-9a-f]{64}\.cms',row['localFile']):raise RuntimeError('Unsafe media archive filename')
                    member=tar.getmember(row['localFile'])
                    if member.size>800_000_000:raise RuntimeError('Media object too large')
                    encrypted=work/'one.cms';digest=hashlib.sha256()
                    with tar.extractfile(member) as source,encrypted.open('xb') as destination:
                        while True:
                            chunk=source.read(1024*1024)
                            if not chunk:break
                            digest.update(chunk);destination.write(chunk)
                    if digest.hexdigest()!=row['encryptedSHA256']:raise RuntimeError('Encrypted media checksum mismatch')
                    local='files/'+Path(row['localFile']).stem;target=output/local;target.parent.mkdir(mode=0o700,exist_ok=True)
                    seal.transform(encrypted,target,certificate,key);encrypted.unlink()
                    if target.stat().st_size!=row['bytes'] or seal.sha256(target)!=row['sha256']:raise RuntimeError('Restored media checksum mismatch')
                    row['restoredFile']=local;count+=1;size+=row['bytes']
            (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(output/'manifest.json').chmod(0o600)
        return {'passed':True,'files':count,'bytes':size,'allEncryptedAndPlainSHA256Match':True,'originalNamesAndHTTPMetadataPreserved':True}
    except Exception:
        # The caller can inspect/delete a failed target. Never publish success.
        raise

if __name__=='__main__':
    os.umask(0o077);p=argparse.ArgumentParser()
    for name in ['archive','output','certificate','private-key']:p.add_argument('--'+name,required=True)
    a=p.parse_args();print(json.dumps(restore(a.archive,a.output,a.certificate,a.private_key)))
