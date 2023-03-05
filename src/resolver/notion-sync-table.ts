import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import * as _ from "lodash";
import { NotionSync } from "../../common/models";

export class NotionSyncTable extends MongoDBTableBase("notion-sync") {
  public async getLastSyncTime(name: string): Promise<number | undefined> {
    const item = await this.getItem<NotionSync>("_id", name);
    return item?.lastSyncTime;
  }

  public async updateLastSyncTime(name: string) {
    const obj = { lastSyncTime: new Date().getTime() };
    const existing = await this.getLastSyncTime(name);
    if (existing) {
      await this.updateItemByObjectId<NotionSync>(name, obj);
    } else {
      await this.putItem<NotionSync>({
        id: name,
        ...obj,
      });
    }
  }
}
