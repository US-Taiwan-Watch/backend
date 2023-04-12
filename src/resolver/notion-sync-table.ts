import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import * as _ from "lodash";
import { NotionSync } from "../../common/models";

export class NotionSyncTable extends MongoDBTableBase("notion-sync") {
  public async get(name: string): Promise<NotionSync | null> {
    return this.getItem<NotionSync>("_id", name);
  }

  public async createOrReplace(sync: NotionSync) {
    const existing = await this.get(sync.id);
    if (existing) {
      const { id, ...update } = sync;
      await this.updateItemByObjectId<NotionSync>(id, update);
    } else {
      await this.putItem(sync);
    }
  }
}
