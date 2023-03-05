import _ from "lodash";
import { Resolver } from "type-graphql";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  public async getLastSyncTime(name: string) {
    const tbl = await this.table();
    return await tbl.getLastSyncTime(name);
  }

  public async updateLastSyncTime(name: string) {
    const tbl = await this.table();
    return await tbl.updateLastSyncTime(name);
  }
}
