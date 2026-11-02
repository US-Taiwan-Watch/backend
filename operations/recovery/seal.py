#!/usr/bin/env python3
"""Authenticated backup encryption; only the public recipient certificate goes online."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

def execute(args):
    p=subprocess.run(['openssl',*args],capture_output=True,timeout=600)
    if p.returncode: raise RuntimeError('Backup cryptographic operation failed')
    return p.stdout

def sha256(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def keygen(directory, bits=4096):
    directory=Path(directory);directory.mkdir(mode=0o700,parents=True,exist_ok=True)
    key=directory/'recipient.key';cert=directory/'recipient.crt'
    if key.exists() or cert.exists():raise RuntimeError('An existing recovery key must not be replaced')
    previous=os.umask(0o077)
    try:
        execute(['req','-x509','-newkey','rsa:'+str(bits),'-nodes','-sha256','-days','3650','-subj','/CN=USTW Recovery Recipient/O=USTW','-addext','basicConstraints=critical,CA:FALSE','-addext','keyUsage=critical,keyEncipherment','-keyout',str(key),'-out',str(cert)])
        key.chmod(0o600);cert.chmod(0o600)
    finally:os.umask(previous)
    return key,cert

def transform(source,output,certificate,private_key=None):
    source=Path(source);output=Path(output)
    if output.exists():raise RuntimeError('An existing recovery file must not be replaced')
    if source.resolve()==output.resolve():raise RuntimeError('Input and output must differ')
    fd,name=tempfile.mkstemp(prefix='.'+output.name+'-',dir=output.parent)
    os.close(fd);temporary=Path(name);temporary.chmod(0o600)
    try:
        if private_key is None:
            execute(['cms','-encrypt','-aes-256-gcm','-binary','-stream','-in',str(source),'-outform','DER','-out',str(temporary),'-recip',str(certificate),'-keyopt','rsa_padding_mode:oaep','-keyopt','rsa_oaep_md:sha256'])
        else:
            execute(['cms','-decrypt','-binary','-inform','DER','-in',str(source),'-recip',str(certificate),'-inkey',str(private_key),'-out',str(temporary)])
        with temporary.open('rb') as file:os.fsync(file.fileno())
        # Hard-link publication fails atomically if another process created output.
        os.link(temporary,output)
        return {'bytes':output.stat().st_size,'sha256':sha256(output),'mode':'encrypted' if private_key is None else 'decrypted'}
    finally:temporary.unlink(missing_ok=True)

def main():
    parser=argparse.ArgumentParser();sub=parser.add_subparsers(dest='mode',required=True)
    create=sub.add_parser('keygen');create.add_argument('--directory',required=True)
    for name in ['encrypt','decrypt']:
        item=sub.add_parser(name);item.add_argument('--source',required=True);item.add_argument('--output',required=True);item.add_argument('--certificate',required=True)
        if name=='decrypt':item.add_argument('--private-key',required=True)
    args=parser.parse_args()
    if args.mode=='keygen':
        key,cert=keygen(args.directory);print(json.dumps({'keyCreated':True,'certificateSHA256':sha256(cert),'privateKeyOnline':False}))
    else:print(json.dumps(transform(args.source,args.output,args.certificate,getattr(args,'private_key',None))))

if __name__=='__main__':main()
