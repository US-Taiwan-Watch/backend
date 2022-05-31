import 'reflect-metadata';
import { MemberResolver } from "../../src/resolver/member.resolver";

// yarn ts-node ./scripts/testing/member-sync-one.ts

if (require.main === module) {
  new MemberResolver().fetchAndSyncMemberById('S000622').then(l => {
    console.log("member-sync-one: S000622");
    console.log(l);
  });

  new MemberResolver().fetchAndSyncMemberById('C000721').then(l => {
    console.log("member-sync-one: C000721");
    console.log(l);
  })
}

