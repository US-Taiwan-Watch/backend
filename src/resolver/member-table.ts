import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Member } from "../../common/models";
import * as _ from "lodash";

export class MemberTable extends MongoDBTableBase("members") {
  public addMember(member: Member) {
    return this.putItem(member);
  }

  public async getMembers(ids: string[], ...attrNamesToGet: (keyof Member)[]): Promise<Member[]> {
    return await this.getItems<Member>('_id', ids, attrNamesToGet);
  }

  public async getAllMembers(): Promise<Member[]> {
    return await this.getAllItems<Member>();
  }

  public getMember(bioGuideId: string, ...attrNamesToGet: (keyof Member)[]): Promise<Member | null> {
    return this.getItem<Member>('_id', bioGuideId, attrNamesToGet);
  }

  public updateMember(id: string, update: Partial<Member>) {
    return this.updateItemByObjectId<Member>(id, update);
  }

  public async createOrReplaceMember(member: Member) {
    const existing = await this.getMember(member.id);
    if (existing) {
      const { id, ...updateMember } = member;
      this.updateMember(member.id, updateMember);
    } else {
      this.addMember(member);
    }
  }

}
