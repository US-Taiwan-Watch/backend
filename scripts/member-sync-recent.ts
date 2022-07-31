import 'reflect-metadata';
import { MemberResolver } from "../src/resolver/member.resolver";

/**
 * yarn ts-node ./scripts/member-sync-recent.ts
 *
 * This script will be run on a regular basis to
 *    (1) fetch from database and, to
 *    (2) sync members of the latest 2 terms for both senate and house and then, to
 *    (3) update to database if any difference exists
 */

if (require.main === module) {
  const currYear = new Date().getFullYear();
  const currCongress = 117 + Math.floor((currYear - 2021) / 2);   // check for session start data: Jan. 3?

  console.log(`Start sync recent members [Congress Num ${currCongress - 1} and ${currCongress}] @${Date.now()}`);

  // Sync for latest 2 terms of Senate
  new MemberResolver().fetchAndSyncMemberByCongress('senate', currCongress - 1).then(_ => {
    console.log(`sync senate ${currCongress - 1} succcessfully!`);
  });

  new MemberResolver().fetchAndSyncMemberByCongress('senate', currCongress).then(_ => {
    console.log(`sync senate ${currCongress} succcessfully!`);
  });

  // Sync for latest 2 terms of House
  new MemberResolver().fetchAndSyncMemberByCongress('house', currCongress - 1).then(_ => {
    console.log(`sync house ${currCongress - 1} succcessfully!`);
  });

  new MemberResolver().fetchAndSyncMemberByCongress('house', currCongress).then(_ => {
    console.log(`sync house ${currCongress} succcessfully!`);
  });

  console.log(`Sync recent members [Congress Num ${currCongress - 1} and ${currCongress}] finished @${Date.now()}`);
}

