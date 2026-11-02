import importlib.util,unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('backup',Path(__file__).with_name('backup.py'));backup=importlib.util.module_from_spec(spec);spec.loader.exec_module(backup)

class Limits(unittest.TestCase):
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
