import "reflect-metadata";
import { BillResolver } from "../../src/resolver/bill.resolver";

// yarn ts-node ./scripts/testing/bill-sync-one.ts

if (require.main === module) {
  new BillResolver().syncBillWithId("110-s-3107").then(b => {});
}
