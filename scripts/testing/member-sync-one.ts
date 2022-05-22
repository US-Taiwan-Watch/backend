import 'reflect-metadata';
import { MemberResolver } from "../../src/resolver/member.resolver";

// yarn ts-node ./scripts/testing/member-sync-one.ts

if (require.main === module) {
  new MemberResolver().syncMemberWithId('S000622', ['firstName']).then(l => {
    console.log(l);
  })
}

