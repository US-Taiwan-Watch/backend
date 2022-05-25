import 'reflect-metadata';
import { MemberResolver } from "../src/resolver/member.resolver";

/**
 * yarn ts-node ./scripts/member-sync-all.ts
 *
 * This script will be run on a regular basis to sync all updated members
 */

if (require.main === module) {
  new MemberResolver().fetchAndSyncAllMembers().then(_ => {
    console.log('sync succcessfully!');
  })
}

