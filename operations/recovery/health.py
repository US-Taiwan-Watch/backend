#!/usr/bin/env python3
"""Publish only backup booleans into the existing health heartbeat."""
import json
from pathlib import Path
import subprocess,time

def check():
    checks={}
    try:
        state=json.loads(Path('/var/lib/ustw-recovery/status.json').read_text())
        checks['offServerBackupHealthy']=state.get('ok') is True and 0<=time.time()-state['lastSuccessEpoch']<30*3600
        checks['backupCredentialValidBeyond30Days']=state['credentialExpiresEpoch']-time.time()>30*86400
    except Exception:
        checks.update(offServerBackupHealthy=False,backupCredentialValidBeyond30Days=False)
    checks['offServerBackupTimerActive']=subprocess.run(['systemctl','is-active','--quiet','ustw-recovery.timer'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
    return {'checks':checks,'details':{}}

if __name__=='__main__':print(json.dumps(check()))
