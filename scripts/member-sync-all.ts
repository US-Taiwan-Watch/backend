import 'reflect-metadata';
import { MemberResolver } from "../src/resolver/member.resolver";

/**
 * yarn ts-node ./scripts/member-sync-all.ts
 *
 * This script will be run manually to
 *    (1) fetch from database and, to
 *    (2) sync all members in U.S. history and then, to
 *    (3) update to database
 */

if (require.main === module) {
  console.log(`Start to sync all members @${Date.now()}`);

  new MemberResolver().fetchAndSyncAllMembers().then(_ => {
    console.log('sync all members succcessfully!');
  })

  console.log(`Sync all members finished @${Date.now()}`);
}

