import importlib.util,io,json,tarfile,tempfile,unittest
from pathlib import Path
import seal
spec=importlib.util.spec_from_file_location('restore_media',Path(__file__).with_name('restore_media.py'));restore=importlib.util.module_from_spec(spec);spec.loader.exec_module(restore)

class RecoveryFormat(unittest.TestCase):
    def test_daily_archive_restores_and_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder);key,cert=seal.keygen(p/'key',2048)
            source=p/'plain';source.write_bytes(b'invented private upload\x00\xff')
            sealed=p/'one.cms';seal.transform(source,sealed,cert)
            name='files/'+'a'*64+'.cms'
            manifest={'version':1,'files':[{'localFile':name,'bytes':source.stat().st_size,'sha256':seal.sha256(source),'encryptedSHA256':seal.sha256(sealed),'container':'invented','name':'original.jpg','properties':{'Content-Type':'image/jpeg'},'metadata':{'purpose':'test'}}]}
            for malicious in [False,True]:
                tarpath=p/('bad.tar' if malicious else 'ok.tar')
                with tarfile.open(tarpath,'x') as archive:
                    data=json.dumps(manifest).encode();entry=tarfile.TarInfo('manifest.json');entry.size=len(data);archive.addfile(entry,io.BytesIO(data));archive.add(sealed,arcname='../outside' if malicious else name,recursive=False)
                encrypted=Path(str(tarpath)+'.cms');seal.transform(tarpath,encrypted,cert)
                output=p/('bad-output' if malicious else 'ok-output')
                if malicious:
                    with self.assertRaises(RuntimeError):restore.restore(encrypted,output,cert,key)
                    self.assertFalse((p/'outside').exists())
                else:
                    result=restore.restore(encrypted,output,cert,key);self.assertTrue(result['passed'])
                    self.assertEqual((output/'files'/('a'*64)).read_bytes(),source.read_bytes())

if __name__=='__main__':unittest.main()
