import _ from "lodash";
import { Resolver } from "type-graphql";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  public async getLastSync(name: string) {
    const tbl = await this.table();
    return await tbl.get(name);
  }

  public async updateLastSyncTime(name: string, databaseId: string) {
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: name,
      databaseId,
      lastSyncTime: new Date().getTime(),
    });
  }
}
