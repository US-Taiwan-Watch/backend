#!/usr/bin/env python3
"""Send boolean health results only; never upload database records or credentials."""
import json, pathlib, subprocess, time, urllib.request

def main():
    config = json.loads(pathlib.Path('/etc/ustw-monitor.json').read_text())
    if not config['url'].startswith('https://'):
        raise RuntimeError('HTTPS required')
    subprocess.run(['systemctl','start','ustw-mongodb-health.service'],check=False,timeout=90)
    state = json.loads(pathlib.Path('/var/lib/ustw-mongodb-health/status.json').read_text())
    if not 0 <= time.time() - state['checkedAtEpoch'] < 120:
        raise RuntimeError('Health checker did not produce a fresh result')
    body = json.dumps({k:state[k] for k in ['checkedAtEpoch','passed','checks']}).encode()
    request = urllib.request.Request(config['url'],data=body,headers={'Content-Type':'application/json','Authorization':'Bearer '+config['token']})
    with urllib.request.urlopen(request,timeout=20) as response:
        if response.status != 200: raise RuntimeError('Heartbeat was not accepted')
    print('USTW database health heartbeat accepted; healthy='+str(state['passed']))

if __name__ == '__main__': main()
