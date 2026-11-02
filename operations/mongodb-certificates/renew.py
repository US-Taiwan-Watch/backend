#!/usr/bin/env python3
"""Renew this host's MongoDB leaf certificate without taking the service down."""
import argparse
import datetime as dt
import fcntl
import grp
import json
import os
from pathlib import Path
import pwd
import secrets
import socket
import subprocess
import tempfile
import time

TLS = Path('/etc/mongodb/tls')
ISSUER = Path('/etc/mongodb/renewal-issuer')
STATE = Path('/var/lib/ustw-certificate-renewal')
CONFIG = Path('/etc/ustw-certificate-renewal.json')
EXPECTED_NAMES = {'DNS:45-61-62-229.us-se-cloud-xip.com', 'DNS:localhost', 'IP:127.0.0.1', 'IP:45.61.62.229'}
LEAF_EXTENSIONS = '''basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
subjectAltName=DNS:45-61-62-229.us-se-cloud-xip.com,DNS:localhost,IP:127.0.0.1,IP:45.61.62.229
'''

def command(args, timeout=30, input_data=None):
    result = subprocess.run(args, input=input_data, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('Command failed: ' + args[0])
    return result.stdout.strip()

def atomic(path, content, mode=0o600, owner=None):
    path = Path(path)
    fd, name = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    try:
        os.fchmod(fd, mode)
        if owner is not None: os.fchown(fd, *owner)
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content); stream.flush(); os.fsync(stream.fileno())
        os.replace(name, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try: os.fsync(directory)
        finally: os.close(directory)
    finally:
        if os.path.exists(name): os.unlink(name)

def expires(cert):
    value = command(['openssl','x509','-in',str(cert),'-noout','-enddate']).split('=',1)[1]
    return dt.datetime.strptime(value, '%b %d %H:%M:%S %Y %Z').replace(tzinfo=dt.timezone.utc)

def fingerprint(cert):
    return command(['openssl','x509','-in',str(cert),'-noout','-fingerprint','-sha256']).split('=',1)[1]

def renewal_due(end, now=None, days=45):
    return end - (now or dt.datetime.now(dt.timezone.utc)) <= dt.timedelta(days=days)

def validate(cert, issuer, root, key):
    for purpose in ['sslserver','sslclient']:
        command(['openssl','verify','-purpose',purpose,'-CAfile',str(root),'-untrusted',str(issuer),str(cert)])
    for kind, name in [('hostname','localhost'),('hostname','45-61-62-229.us-se-cloud-xip.com'),('ip','127.0.0.1'),('ip','45.61.62.229')]:
        command(['openssl','verify','-CAfile',str(root),'-untrusted',str(issuer),'-verify_'+kind,name,str(cert)])
    names = command(['openssl','x509','-in',str(cert),'-noout','-ext','subjectAltName'])
    found = {x.strip().replace('IP Address:','IP:') for x in names.split('\n',1)[1].split(',')}
    if found != EXPECTED_NAMES: raise RuntimeError('Unexpected certificate identities')
    if command(['openssl','x509','-in',str(cert),'-noout','-subject','-nameopt','RFC2253']) != command(['openssl','x509','-in',str(TLS/'server.crt'),'-noout','-subject','-nameopt','RFC2253']):
        raise RuntimeError('Certificate subject changed')
    if command(['openssl','x509','-in',str(cert),'-noout','-pubkey']) != command(['openssl','pkey','-in',str(key),'-pubout']):
        raise RuntimeError('Certificate and key mismatch')
    if expires(cert) >= expires(issuer): raise RuntimeError('Leaf outlives issuer')
    command(['openssl','x509','-in',str(cert),'-noout','-checkend',str(60*86400)])

def rotate():
    # Script reads the existing root-only administrator credential itself.
    raw = command(['mongosh','--quiet','--norc','--host','127.0.0.1','--tls','--tlsCAFile',str(TLS/'ca.crt'),'--file','/usr/local/libexec/ustw-rotate-certificate.js'],60)
    result = json.loads(raw.splitlines()[-1])
    if result.get('ok') != 1: raise RuntimeError('MongoDB rejected certificate reload')

def served_fingerprint():
    # Match the existing MongoDB/Node trust policy. The original root CA predates
    # Python's new strict keyUsage requirement; no trust/hostname checks are bypassed.
    peer=command(['openssl','s_client','-connect','127.0.0.1:27017','-servername','45-61-62-229.us-se-cloud-xip.com','-verify_hostname','45-61-62-229.us-se-cloud-xip.com','-verify_return_error','-CAfile',str(TLS/'ca.crt')],input_data='')
    return command(['openssl','x509','-noout','-fingerprint','-sha256'],input_data=peer).split('=',1)[1]

def verify_connection():
    value=served_fingerprint()
    raw=command(['mongosh','--quiet','--norc','--host','127.0.0.1','--tls','--tlsCAFile',str(TLS/'ca.crt'),'--file','/root/ustw-provisioning/health-json.js'],60)
    health=json.loads(raw.splitlines()[-1])
    if not health.get('primary') or not all(v for v in health.values() if isinstance(v,bool)):
        raise RuntimeError('Fresh authenticated database health check failed')
    return value

def install_transaction(cert, bundle, snapshot, reload_cert=rotate, verify=verify_connection):
    """The pending journal also supports rollback after an interrupted process."""
    account = pwd.getpwnam('mongodb')
    owner = (account.pw_uid,grp.getgrnam('mongodb').gr_gid)
    before = {name:(TLS/name).read_bytes() for name in ['server.crt','server.pem']}
    snapshot.mkdir(mode=0o700)
    for name, data in before.items(): atomic(snapshot/name,data)
    atomic(STATE/'pending.json',json.dumps({'snapshot':str(snapshot)}).encode())
    try:
        atomic(TLS/'server.crt',Path(cert).read_bytes(),0o600,owner)
        atomic(TLS/'server.pem',bundle,0o600,owner)
        reload_cert()
        if verify() != fingerprint(cert): raise RuntimeError('New certificate not served')
    except Exception:
        for name,data in before.items(): atomic(TLS/name,data,0o600,owner)
        reload_cert()
        if verify() != fingerprint(TLS/'server.crt'): raise RuntimeError('Certificate rollback verification failed')
        (STATE/'pending.json').unlink()
        raise
    (STATE/'pending.json').unlink()

def recover_pending():
    pending = STATE/'pending.json'
    if not pending.exists(): return
    snapshot = Path(json.loads(pending.read_text())['snapshot']).resolve()
    if snapshot.parent != (STATE/'history').resolve(): raise RuntimeError('Invalid recovery journal')
    account = pwd.getpwnam('mongodb')
    owner = (account.pw_uid,grp.getgrnam('mongodb').gr_gid)
    for name in ['server.crt','server.pem']:
        atomic(TLS/name,(snapshot/name).read_bytes(),0o600,owner)
    rotate()
    if verify_connection() != fingerprint(TLS/'server.crt'): raise RuntimeError('Interrupted rotation rollback failed')
    pending.unlink()

def run(force=False, check_only=False):
    config = json.loads(CONFIG.read_text())
    if socket.gethostname() != config['hostname']: raise RuntimeError('Unexpected host')
    if fingerprint(TLS/'ca.crt') != config['rootFingerprint']: raise RuntimeError('Trust root changed')
    if fingerprint(ISSUER/'issuer.crt') != config['issuerFingerprint']: raise RuntimeError('Renewal issuer changed')
    if (ISSUER/'issuer.key').stat().st_mode & 0o077: raise RuntimeError('Issuer key is not protected')
    command(['openssl','verify','-CAfile',str(TLS/'ca.crt'),str(ISSUER/'issuer.crt')])
    command(['openssl','x509','-in',str(ISSUER/'issuer.crt'),'-noout','-checkend',str(100*86400)])
    recover_pending()
    before = fingerprint(TLS/'server.crt')
    result = {'checkedAtEpoch':int(time.time()),'ok':True,'rotated':False,'beforeFingerprint':before,'leafExpires':expires(TLS/'server.crt').isoformat(),'issuerExpires':expires(ISSUER/'issuer.crt').isoformat(),'rootUnchanged':True}
    if force or check_only or renewal_due(expires(TLS/'server.crt')):
        with tempfile.TemporaryDirectory(prefix='candidate-',dir=STATE) as directory:
            candidate = Path(directory); csr=candidate/'leaf.csr'; cert=candidate/'leaf.crt'; ext=candidate/'leaf.ext'
            ext.write_text(LEAF_EXTENSIONS)
            command(['openssl','req','-new','-sha256','-key',str(TLS/'server.key'),'-out',str(csr),'-subj','/CN=45-61-62-229.us-se-cloud-xip.com/O=USTW'])
            command(['openssl','x509','-req','-in',str(csr),'-CA',str(ISSUER/'issuer.crt'),'-CAkey',str(ISSUER/'issuer.key'),'-set_serial','0x'+secrets.token_hex(16),'-out',str(cert),'-days','90','-sha256','-extfile',str(ext)])
            validate(cert,ISSUER/'issuer.crt',TLS/'ca.crt',TLS/'server.key')
            result['candidateValidated']=True
            if not check_only:
                pid_before = command(['systemctl','show','mongod','--property','MainPID','--value'])
                bundle=(TLS/'server.key').read_bytes()+cert.read_bytes()+(ISSUER/'issuer.crt').read_bytes()
                snapshot = STATE/'history'/(dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+secrets.token_hex(4))
                install_transaction(cert,bundle,snapshot)
                if command(['systemctl','show','mongod','--property','MainPID','--value']) != pid_before: raise RuntimeError('Unexpected database process change')
                result.update(rotated=True,afterFingerprint=fingerprint(cert),leafExpires=expires(cert).isoformat(),databaseRestarted=False,rollbackSnapshot=str(snapshot))
    if not check_only:
        result['servedCertificateMatchesFile'] = served_fingerprint() == fingerprint(TLS/'server.crt')
        if not result['servedCertificateMatchesFile']: raise RuntimeError('Served certificate differs from file')
        atomic(STATE/'status.json',json.dumps(result,indent=2).encode())
    return result

def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('--force',action='store_true');parser.add_argument('--check-only',action='store_true');args=parser.parse_args()
    STATE.mkdir(mode=0o700,exist_ok=True);(STATE/'history').mkdir(mode=0o700,exist_ok=True)
    with (STATE/'lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        try: print(json.dumps(run(args.force,args.check_only)))
        except Exception as error:
            result={'checkedAtEpoch':int(time.time()),'ok':False,'errorType':type(error).__name__,'message':str(error)}
            if not args.check_only: atomic(STATE/'status.json',json.dumps(result).encode())
            print(json.dumps(result));raise SystemExit(1)

if __name__ == '__main__': main()
