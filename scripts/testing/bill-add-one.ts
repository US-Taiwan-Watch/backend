import 'reflect-metadata';
import { BillResolver } from "../../src/resolver/bill.resolver";

// yarn ts-node ./scripts/bill-add-one.ts

if (require.main === module) {
  new BillResolver().addBill(124, 's', 202);
}

