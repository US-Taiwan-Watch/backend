import 'reflect-metadata';
import request from 'request';
import { RequestHelper } from '../src/data-sync/sources/request-helper';
import { AzureStorageManager, Container } from '../src/storage/azure-storage-manager';

// yarn ts-node ./scripts/download-file.ts

if (require.main === module) {
  RequestHelper.getFile('https://www.congress.gov/116/bills/s504/BILLS-116s504enr.pdf', 'pdf').then(file => {
    AzureStorageManager.uploadBlob(Container.TEST, 'test.pdf', 'pdf', file).then(l =>
      console.log(l)
    );
  })
}

