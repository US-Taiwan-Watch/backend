import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Legislator } from "../../common/models";
import * as _ from "lodash";

export class LegislatorTable extends MongoDBTableBase("legislators") {
  public addLegislator(legislator: Legislator) {
    return this.putItem(legislator);
  }

  public async getAllLegislators(): Promise<Legislator[]> {
    // return await this.getAllItems<Legislator>();
    return await this.queryItemsWorking({ 'bioGuideId': { $ne: null } });
  }

  public getLegislator(bioGuideId: string, ...attrNamesToGet: (keyof Legislator)[]): Promise<Legislator | null> {
    return this.getItem<Legislator>('bioGuideId', bioGuideId, attrNamesToGet);
  }

  // public updateLegislator(id: string, update: Partial<User>) {
  // this.updateItemByCustomQuery()
  // return this.updateItemByObjectId<User>(id, update);
  // }

}
