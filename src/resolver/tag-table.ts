import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Tag } from "../../common/models";
import * as _ from "lodash";

export class TagTable extends MongoDBTableBase("tags_mirror") {
  public async getAllTags(): Promise<Tag[]> {
    return await this.getAllItems<Tag>();
  }

  public updateTag(id: string, update: Partial<Tag>) {
    return this.updateItemByObjectId(id, update);
  }
}
