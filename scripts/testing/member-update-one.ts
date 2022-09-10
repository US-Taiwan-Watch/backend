import 'reflect-metadata';
import { MemberResolver } from "../../src/resolver/member.resolver";
import { Member } from "../../common/models";

// yarn ts-node ./scripts/testing/member-update-one.ts

if (require.main === module) {
  const update_data: Member = {
    id: "S000622",
    firstName: "FAKE FIRSTNAME",
    firstName_zh: "假ㄉ",
    lastName: "Smith",
    revokedFields: ["middleName"]
  };

  new MemberResolver().updateMemberWithData(update_data).then(l => {
    console.log("\nmember-sync-one: S000622");
    console.log(JSON.stringify(l, null, 4));
  });
}