import 'reflect-metadata';
import { BillResolver } from "../src/resolver/bill.resolver";

// yarn ts-node ./scripts/bill-download-all.ts

if (require.main === module) {
  new BillResolver().downloadAllBillVersions().then(l => {
    console.log('downloaded!');
  })
}

