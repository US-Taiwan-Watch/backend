import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Member } from "../../common/models";
import * as _ from "lodash";

export class MemberTable extends MongoDBTableBase("legislators") {
  public addMember(member: Member) {
    return this.putItem(member);
  }

  public async getAllMembers(): Promise<Member[]> {
    // return await this.getAllItems<Member>();
    return await this.queryItemsWorking({ 'bioGuideId': { $ne: null } });
  }

  public getMember(bioGuideId: string, ...attrNamesToGet: (keyof Member)[]): Promise<Member | null> {
    return this.getItem<Member>('bioGuideId', bioGuideId, attrNamesToGet);
  }

  // public updateMember(id: string, update: Partial<User>) {
  // this.updateItemByCustomQuery()
  // return this.updateItemByObjectId<User>(id, update);
  // }

}
