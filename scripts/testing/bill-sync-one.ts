import 'reflect-metadata';
import { BillResolver } from "../../src/resolver/bill.resolver";

// yarn ts-node ./scripts/testing/bill-sync-one.ts

if (require.main === module) {
  new BillResolver().syncBillWithId('92-s-2796', []).then(b =>
    console.log(b));
}

