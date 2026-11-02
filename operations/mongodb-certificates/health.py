#!/usr/bin/env python3
"""Boolean renewal health, included in the existing database/Azure report."""
import json
from pathlib import Path
import subprocess
import time

def check():
    checks={};details={}
    try:
        status=json.loads(Path('/var/lib/ustw-certificate-renewal/status.json').read_text())
        checks['certificateRenewalHealthy']=status.get('ok') is True and 0 <= time.time()-status['checkedAtEpoch'] < 40*3600
        details['certificateRenewalLastCheckedEpoch']=status['checkedAtEpoch']
    except Exception: checks['certificateRenewalHealthy']=False
    checks['certificateIssuerValidBeyond90Days']=subprocess.run(['openssl','x509','-in','/etc/mongodb/renewal-issuer/issuer.crt','-noout','-checkend',str(90*86400)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
    checks['certificateRenewalTimerActive']=subprocess.run(['systemctl','is-active','--quiet','ustw-certificate-renewal.timer']).returncode==0
    return {'checks':checks,'details':details}

if __name__ == '__main__': print(json.dumps(check()))
