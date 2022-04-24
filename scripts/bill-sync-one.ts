import 'reflect-metadata';
import { BillResolver } from "../src/resolver/bill.resolver";


if (require.main === module) {
  new BillResolver().syncBillWithKeys(110, 's', 3107, []).then(l => {
    console.log(l);
  })
}

