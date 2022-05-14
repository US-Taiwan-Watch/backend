import 'reflect-metadata';
import { RequestHelper, RequestSource } from '../src/data-sync/sources/request-helper';
import { AzureStorageManager, Container } from '../src/storage/azure-storage-manager';
import { MemberProPicHelper } from '../src/storage/member-pro-pic-helper';

// yarn ts-node ./scripts/download-file.ts

if (require.main === module) {
  RequestHelper.from(RequestSource.CONGRESS_GOV).get('https://theunitedstates.io/congress-legislators/legislators-current.json').then(file => {
    AzureStorageManager.uploadBlob(Container.TEST, 'test.txt', 'txt', file).then(l =>
      console.log(l)
    );
  });
  RequestHelper.from(RequestSource.CONGRESS_GOV).get('https://www.govinfo.gov/bulkdata/BILLSTATUS/116/s/BILLSTATUS-116s504.xml').then(file => {
    AzureStorageManager.uploadBlob(Container.TEST, 'test.xml', 'xml', file).then(l =>
      console.log(l)
    );
  });
  RequestHelper.from(RequestSource.CONGRESS_GOV).getFile('https://bioguide.congress.gov/bioguide/photo/S/S000622.jpg', 'jpg').then(file => {
    MemberProPicHelper.upload('S000622', file).then(l =>
      console.log(l)
    );
  });
}
