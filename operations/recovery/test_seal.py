import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('seal',Path(__file__).with_name('seal.py'));seal=importlib.util.module_from_spec(spec);spec.loader.exec_module(seal)

class EncryptionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.directory=Path(cls.temp.name)
        cls.key,cls.cert=seal.keygen(cls.directory/'keys',3072)
        cls.other,cls.other_cert=seal.keygen(cls.directory/'other',3072)
        cls.source=cls.directory/'sample';cls.source.write_bytes(bytes(range(256))*1000)
        cls.encrypted=cls.directory/'sample.cms';seal.transform(cls.source,cls.encrypted,cls.cert)
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def test_round_trip_preserves_all_binary_bytes(self):
        output=self.directory/'restored';seal.transform(self.encrypted,output,self.cert,self.key)
        self.assertEqual(output.read_bytes(),self.source.read_bytes());self.assertEqual(output.stat().st_mode&0o777,0o600)
    def test_wrong_key_is_rejected_without_retaining_partial_plaintext(self):
        output=self.directory/'wrong'
        with self.assertRaises(RuntimeError):seal.transform(self.encrypted,output,self.other_cert,self.other)
        self.assertFalse(output.exists());self.assertFalse(list(self.directory.glob('.wrong-*')))
    def test_modified_ciphertext_is_rejected(self):
        broken=self.directory/'broken.cms';data=bytearray(self.encrypted.read_bytes());data[len(data)//2]^=1;broken.write_bytes(data)
        output=self.directory/'corrupt'
        with self.assertRaises(RuntimeError):seal.transform(broken,output,self.cert,self.key)
        self.assertFalse(output.exists());self.assertFalse(list(self.directory.glob('.corrupt-*')))
    def test_existing_key_and_backup_cannot_be_overwritten(self):
        with self.assertRaises(RuntimeError):seal.keygen(self.directory/'keys',3072)
        before=self.encrypted.read_bytes()
        with self.assertRaises(RuntimeError):seal.transform(self.source,self.encrypted,self.cert)
        self.assertEqual(before,self.encrypted.read_bytes())
    def test_private_key_permissions(self):self.assertEqual(self.key.stat().st_mode&0o777,0o600)

if __name__=='__main__':unittest.main()
