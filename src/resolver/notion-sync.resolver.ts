import _ from "lodash";
import { Resolver } from "type-graphql";
import { NotionPage } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";
import { SyncWithNotion, TagResolver } from "./tag.resolver";
import { Logger } from "../util/logger";

export enum NotionDatabase {
  TAGS = "Tags",
  // bills = "Bills",
}

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  constructor(private logger = new Logger("NotionSyncResolver")) {
    super();
  }

  private static getResolver(name: NotionDatabase): SyncWithNotion<NotionPage> {
    switch (name) {
      case NotionDatabase.TAGS:
        return new TagResolver();
    }
  }

  public async updateLastSyncTime(name: string, databaseId: string) {
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: name,
      databaseId,
      lastSyncTime: new Date().getTime(),
    });
  }

  public async syncWithNotion(table: NotionDatabase, buffer = 5 * 60 * 1000) {
    const tbl = await this.table();
    const sync = await tbl.get(table);
    if (!sync) {
      return;
    }
    const logger = this.logger.in("syncWithNotion");

    const resolver = NotionSyncResolver.getResolver(table);

    const notionSyncer = resolver.getNotionManager(sync.databaseId);
    if (buffer >= 0) {
      const lastUpdated = await notionSyncer.getLastUpdatedTime();
      if (lastUpdated && lastUpdated <= sync.lastSyncTime - buffer) {
        // Only update notion status but not DB sync time as nothing has been updated
        notionSyncer.updateSyncStatus();
        logger.log(
          `Skipped. last edited time: ${new Date(
            lastUpdated || 0,
          )} and last sync time: ${new Date(sync.lastSyncTime)}`,
        );
        return;
      }
    }
    logger.log("Started");
    const allTags = await notionSyncer.queryAll();

    const updatedOrCreated =
      buffer < 0
        ? allTags
        : allTags.filter(
            (t: any) =>
              new Date(t.last_edited_time).getTime() >
              sync.lastSyncTime - buffer,
          );

    const upsertJobs = Promise.all(
      updatedOrCreated.map(t => resolver.createOrUpdateItemFromNotion(t)),
    );

    logger.log("Collection done, start updating database");
    const [upsertResults, deleted] = await Promise.all([
      upsertJobs,
      resolver.deleteItemsNotFoundInNotion(allTags.map(t => t.id)),
    ]);

    console.log(upsertResults);

    const upsertSummary = upsertResults.reduce(
      (acc, r) => ({
        upsertedCount: acc.upsertedCount + r.upsertedCount,
        modifiedCount: acc.modifiedCount + r.modifiedCount,
      }),
      {
        upsertedCount: 0,
        modifiedCount: 0,
      },
    );

    logger.log(`Created count: ${upsertSummary.upsertedCount}`);
    logger.log(`Updated count: ${upsertSummary.modifiedCount}`);
    logger.log(`Deleted count: ${deleted.length}`);

    await this.updateLastSyncTime(table, sync.databaseId);
    await notionSyncer.updateSyncStatus();
  }
}
