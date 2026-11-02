import datetime as dt
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('renew',Path(__file__).with_name('renew.py'))
renew=importlib.util.module_from_spec(spec);spec.loader.exec_module(renew)

class RenewalTests(unittest.TestCase):
    def test_renewal_boundary(self):
        now=dt.datetime.now(dt.timezone.utc)
        self.assertFalse(renew.renewal_due(now+dt.timedelta(days=46),now))
        self.assertTrue(renew.renewal_due(now+dt.timedelta(days=45),now))
        self.assertTrue(renew.renewal_due(now-dt.timedelta(days=1),now))

    def transaction(self, fail=False):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);tls=root/'tls';tls.mkdir();state=root/'state';state.mkdir()
            (tls/'server.crt').write_bytes(b'old certificate');(tls/'server.pem').write_bytes(b'old bundle')
            candidate=root/'candidate.crt';candidate.write_bytes(b'new certificate')
            real_atomic=renew.atomic;calls=[];owners=[]
            def atomic(path,data,mode=0o600,owner=None):
                if owner is not None:owners.append(owner)
                real_atomic(path,data,mode)
            def fingerprint(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
            def reload_cert():calls.append('reload')
            def verify():
                if fail and len(calls)==1:return 'unexpected certificate'
                return fingerprint(tls/'server.crt')
            with patch.object(renew,'TLS',tls),patch.object(renew,'STATE',state),patch.object(renew,'atomic',atomic),patch.object(renew,'fingerprint',fingerprint),patch.object(renew.pwd,'getpwnam',return_value=types.SimpleNamespace(pw_uid=105,pw_gid=65534)),patch.object(renew.grp,'getgrnam',return_value=types.SimpleNamespace(gr_gid=107)):
                if fail:
                    with self.assertRaisesRegex(RuntimeError,'New certificate not served'):
                        renew.install_transaction(candidate,b'new bundle',state/'snapshot',reload_cert,verify)
                    self.assertEqual((tls/'server.crt').read_bytes(),b'old certificate')
                    self.assertEqual((tls/'server.pem').read_bytes(),b'old bundle')
                    self.assertEqual(len(calls),2)
                else:
                    renew.install_transaction(candidate,b'new bundle',state/'snapshot',reload_cert,verify)
                    self.assertEqual((tls/'server.pem').read_bytes(),b'new bundle')
                    self.assertEqual(len(calls),1)
                self.assertFalse((state/'pending.json').exists())
                self.assertEqual((state/'snapshot/server.pem').read_bytes(),b'old bundle')
                self.assertTrue(owners)
                self.assertTrue(all(owner==(105,107) for owner in owners))

    def test_successful_rotation_keeps_rollback_copy(self):self.transaction()
    def test_failure_restores_both_files_and_reloads_old_certificate(self):self.transaction(True)

    def test_atomic_replacement_and_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'secret';renew.atomic(path,b'first');renew.atomic(path,b'second')
            self.assertEqual(path.read_bytes(),b'second')
            self.assertEqual(path.stat().st_mode & 0o777,0o600)
            self.assertEqual(len(list(Path(directory).iterdir())),1)

if __name__=='__main__':unittest.main()
