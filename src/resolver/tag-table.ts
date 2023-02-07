import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Bill, BillType, Tag } from "../../common/models";
import * as _ from "lodash";

export class TagTable extends MongoDBTableBase("tags") {
  public async getAllTags(): Promise<Tag[]> {
    return await this.getAllItems<Tag>();
  }
}
