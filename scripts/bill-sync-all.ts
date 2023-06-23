import 'reflect-metadata';
import { BillResolver } from '../src/resolver/bill.resolver';

/**
 * yarn ts-node ./scripts/bill-sync-all.ts
 *
 * This script will be run manually to sync all bills in database
 */

if (require.main === module) {
  // new BillResolver().syncAllBills().then(_ => {
  //   console.log('sync succcessfully!');
  // })
  new BillResolver().syncIncompleteBills().then(bills => {
    console.log("sync 116 bills succcessfully!");
  });
}

