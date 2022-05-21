import { intersection } from "lodash";
import { Member } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";


export class MemberSyncer extends EntitySyncer<Member> {
  public static async fetchAll(): Promise<Member[]> {
    // TODO: fetch all members!
    return [];
  }

  public static async fetchUpdated(): Promise<Member[]> {
    // TODO: fetch updated members
    // tmp code just for testing in the script
    const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/116/senate/members.json`);
    return result[0].members.slice(0, 2).map((m: any) => ({ id: m.id }));
  }

  public async sync(): Promise<Member> {
    await new MemberProPublicaSyncer(this.entity, this.fields).sync();
    // Add other syncers here. Will run in sequential. TODO: update to parallel
    return this.entity;
  }
}

class MemberProPublicaSyncer extends EntitySyncer<Member> {
  public async sync(): Promise<Member> {
    if (this.fields == null || this.fields.includes('firstName')) {
      const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${this.entity.id}.json`);
      this.entity.firstName = result[0]['first_name'];
    }
    return this.entity;
  }
}
