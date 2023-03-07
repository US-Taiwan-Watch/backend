import _ from "lodash";
import { Resolver } from "type-graphql";
import { NotionPage } from "../../common/models";
import { NotionManager } from "../data-sync/notion-manager";
import { NotionTagManager } from "../data-sync/notion-tag-manager";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";
import { SyncWithNotion, TagResolver } from "./tag.resolver";

export enum NotionDatabase {
  TAGS = "Tags",
  // bills = "Bills",
}

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  public static getResolver(name: NotionDatabase): SyncWithNotion<NotionPage> {
    switch (name) {
      case NotionDatabase.TAGS:
        return new TagResolver();
    }
  }

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

  public async syncWithNotion(table: NotionDatabase) {
    // too complicated. just refresh all
    const sync = await this.getLastSync(table);
    if (!sync) {
      return;
    }
    const resolver = NotionSyncResolver.getResolver(table);
    const notionSyncer = resolver.getNotionManager(sync.databaseId);
    const lastUpdated = await notionSyncer.getLastUpdatedTime();
    console.log(new Date(lastUpdated || 0));
    console.log(new Date(sync.lastSyncTime));
    if (lastUpdated && lastUpdated <= sync.lastSyncTime) {
      // Only update notion status but not DB sync time as nothing has been updated
      notionSyncer.updateSyncStatus();
      return;
    }
    const [created, updated, rest] = await Promise.all([
      notionSyncer.queryCreatedAfter(sync.lastSyncTime),
      notionSyncer.queryUpdatedAfter(sync.lastSyncTime),
      notionSyncer.queryUpdatedBefore(sync.lastSyncTime),
    ]);

    const jobs: Promise<any>[] = updated.map((t: any) =>
      resolver.updateItemFromNotion(t),
    );

    // This leads to error, will update later
    // jobs.push(
    //   resolver.deleteItemsNotFoundInNotion(rest.concat(updated).map(t => t.id)),
    // );

    if (created.length > 0) {
      jobs.push(resolver.addNewItemsFromNotion(created));
    }

    // const deleted = await tbl.queryItemsWorking<Tag>({
    //   notionPageId: { $nin: rest.concat(updated).map(t => t.id) },
    // });

    jobs.push(this.updateLastSyncTime(table, sync.databaseId));

    console.log(created);
    console.log(updated);

    await Promise.all(jobs);

    // console.log(deleted);
  }
}
