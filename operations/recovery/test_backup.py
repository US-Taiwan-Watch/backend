import importlib.util,unittest,tempfile,time,json,hashlib
from unittest.mock import patch
from pathlib import Path

spec=importlib.util.spec_from_file_location('backup',Path(__file__).with_name('backup.py'));backup=importlib.util.module_from_spec(spec);spec.loader.exec_module(backup)

class Limits(unittest.TestCase):
    def test_media_only_run_produces_no_database_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            base=Path(folder);key,cert=backup.seal.keygen(base/'keys',2048)
            cache=base/'cache';cache.mkdir();encrypted=cache/('a'*64+'.cms');encrypted.write_bytes(b'invented encrypted fixture')
            row={'container':'media-article','name':'fixture.jpg','etag':'etag','bytes':12}
            record={**row,'localFile':'files/'+encrypted.name,'sha256':'fixture','encryptedSHA256':backup.seal.sha256(encrypted)}
            uploaded=[]
            def put(url,name,path):
                uploaded.append(name)
                if name.endswith('receipt.json.cms'):
                    plain=base/'receipt.json';backup.seal.transform(path,plain,cert,key)
                    receipt=json.loads(plain.read_text());self.assertEqual(receipt['scope'],'media');self.assertNotIn('databasePlainSHA256',receipt)
                return {'name':name,'bytes':path.stat().st_size,'sha256':backup.seal.sha256(path)}
            config={'recipientCertificate':str(cert),'credentialExpiresEpoch':time.time()+365*86400,'mediaSources':{'media-article':'unused'},'backupContainer':'unused'}
            with patch.object(backup,'BASE',base),patch.object(backup,'listing',return_value=[{k:v for k,v in row.items() if k!='container'}]),patch.object(backup,'obtain',return_value=record),patch.object(backup,'upload',side_effect=put):
                result=backup.backup(config)
                self.assertEqual(result['scope'],'media');self.assertEqual(len(uploaded),2)
                self.assertTrue(uploaded[0].endswith('/media.tar.cms'));self.assertTrue(uploaded[1].endswith('/receipt.json.cms'))
                backup.backup(config);self.assertEqual(len(uploaded),2)
    def test_budget_blocks_before_download(self):
        row={'bytes':101_000_000}
        with self.assertRaises(RuntimeError):backup.guard([row],[row],0,False)
        with self.assertRaises(RuntimeError):backup.guard([row],[row],4_999_000_000,True)
        with self.assertRaises(RuntimeError):backup.guard([{'bytes':801_000_000}],[],0,False)
        self.assertEqual(backup.guard([row],[],0,False),0)
    def test_source_identity_separates_paths_and_revisions(self):
        self.assertNotEqual(backup.cache_id('a','bc','d'),backup.cache_id('ab','c','d'))
        self.assertNotEqual(backup.cache_id('a','b','etag1'),backup.cache_id('a','b','etag2'))
    def test_storage_origin_and_escaping(self):
        for url in ['http://ustwcmsstorage.blob.core.windows.net/a?s=x','https://evil.example/a?s=x','https://user:password@ustwcmsstorage.blob.core.windows.net/a']:
            with self.assertRaises(RuntimeError):backup.permitted_url(url)
        self.assertIn('/a/name%20%26%3F.jpg?sig=secret',backup.url_for('https://ustwcmsstorage.blob.core.windows.net/a?sig=secret','name &?.jpg'))

if __name__=='__main__':unittest.main()
