import 'reflect-metadata';
import { BillResolver } from "../../src/resolver/bill.resolver";

// yarn ts-node ./scripts/bill-sync-one.ts

if (require.main === module) {
  new BillResolver().syncBillWithId('116-s-504', []);
}

