import 'reflect-metadata';
import { MemberResolver } from "../src/resolver/member.resolver";


if (require.main === module) {
  new MemberResolver().syncMemberWithKey('S000622', ['firstName']).then(l => {
    console.log(l);
  })
}

