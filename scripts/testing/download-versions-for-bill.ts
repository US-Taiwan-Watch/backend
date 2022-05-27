import 'reflect-metadata';
import { RequestHelper, RequestSource } from '../../src/data-sync/sources/request-helper';
import { AzureStorageManager, Container } from '../../src/storage/azure-storage-manager';
import { MemberProPicDownloader } from '../../src/storage/member-pro-pic-downloader';
import { BillVersionDownloader } from '../../src/storage/bill-version-downloader';
import { BillResolver } from '../../src/resolver/bill.resolver';
import { Bill } from '../../common/models';

// yarn ts-node ./scripts/testing/download-version-for-bill.ts

if (require.main === module) {
  run();
}

async function run() {
  const bill = await new BillResolver().bill('110-s-3107');
  if (!bill || !bill.versions) {
    return;
  }
  const contentTypes = BillVersionDownloader.getContentTypes();
  const all = bill.versions.filter(v =>
    !v.downloaded || v.downloaded.length < contentTypes.length
  ).map(v =>
    contentTypes.filter(t => !v.downloaded || !v.downloaded.includes(t)).map(type =>
      new BillVersionDownloader({
        billId: bill.id,
        versionCode: v.code,
        contentType: type
      }).downloadAndUpload().then(suc => {
        if (!v.downloaded) {
          v.downloaded = [];
        }
        v.downloaded = [...v.downloaded, type];
      })
    )
  ).flat();
  const res = await Promise.allSettled(all);
  console.log(bill.versions);
}
