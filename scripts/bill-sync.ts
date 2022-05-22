import 'reflect-metadata';
import { BillResolver } from '../src/resolver/bill.resolver';

/**
 * yarn ts-node ./scripts/bill-sync-all.ts
 *
 * This script will be run manually to sync all newly added bills and bills in current congress
 */

if (require.main === module) {
  new BillResolver().syncNewBills().then(_ => {
    console.log('sync new bills succcessfully!');
  });
  new BillResolver().syncOngoingBills().then(_ => {
    console.log('sync ongoing bills succcessfully!');
  });
}

