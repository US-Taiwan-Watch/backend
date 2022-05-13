import 'reflect-metadata';
import request from 'request';
import { RequestHelper, RequestSource } from '../src/data-sync/sources/request-helper';
import { AzureStorageManager, Container } from '../src/storage/azure-storage-manager';

// yarn ts-node ./scripts/download-file.ts

if (require.main === module) {
  RequestHelper.from(RequestSource.CONGRESS_GOV).getFile('https://www.congress.gov/116/bills/s504/BILLS-116s504enr.pdf', 'pdf').then(file => {
    AzureStorageManager.uploadBlob(Container.TEST, 'test.pdf', 'pdf', file).then(l =>
      console.log(l)
    );
  });
  RequestHelper.from(RequestSource.CONGRESS_GOV).getFile('https://www.congress.gov/116/bills/s504/BILLS-116s504is.pdf', 'pdf').then(file => {
    console.log('downloaded!');
    AzureStorageManager.uploadBlob(Container.TEST, 'test2.pdf', 'pdf', file).then(l =>
      console.log(l)
    );
  });
}

