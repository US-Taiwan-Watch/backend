import { intersection } from "lodash";
import { Member } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";


export class MemberSyncer implements EntitySyncer<Member> {
  public async sync(member: Member, fields: (keyof Member)[]): Promise<Member> {
    await new MemberProPublicaSyncer().sync(member, fields);
    // Add other syncers here. Will run in sequential. TODO: update to parallel
    return member;
  }
}

class MemberProPublicaSyncer implements EntitySyncer<Member> {
  public async sync(member: Member, fields: (keyof Member)[]): Promise<Member> {
    if (fields.includes('firstName')) {
      const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${member.id}.json`);
      member.firstName = result[0]['first_name'];
    }
    return member;
  }
}
