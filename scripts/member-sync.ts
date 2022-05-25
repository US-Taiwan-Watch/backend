import 'reflect-metadata';
import { MemberResolver } from "../src/resolver/member.resolver";

/**
 * yarn ts-node ./scripts/member-sync.ts
 *
 * This script will be run manually to sync all members in U.S. history
 */

if (require.main === module) {
  new MemberResolver().fetchAndSyncUpdatedMembers().then(l => {
    console.log(l);
  })
}

