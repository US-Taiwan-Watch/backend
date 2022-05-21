import 'reflect-metadata';
import { MemberResolver } from "../../src/resolver/member.resolver";

// yarn ts-node ./scripts/member-sync-latest.ts

if (require.main === module) {
  new MemberResolver().fetchAndSyncUpdatedMembers().then(l => {
    console.log(l);
  })
}

