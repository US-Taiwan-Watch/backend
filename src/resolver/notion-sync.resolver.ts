import _ from "lodash";
import { Resolver } from "type-graphql";
import { NotionPage } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";
import { TagResolver } from "./tag.resolver";
import { Logger } from "../util/logger";
import { NotionManager, NotionSyncable } from "../data-sync/notion-manager";
import { ArticleResolver } from "./article.resolver";

const DEFAULT_LOOK_BACK_MS = 5 * 60 * 1000;

export enum TableName {
  TAGS = "tags",
  ARTICLES = "articles",
}

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  constructor(private logger = new Logger("NotionSyncResolver")) {
    super();
  }

  private static getTableResolver(name: TableName): NotionSyncable<NotionPage> {
    switch (name) {
      case TableName.TAGS:
        return new TagResolver();
      case TableName.ARTICLES:
        return new ArticleResolver();
    }
  }

  private async updateLastSyncTime(
    notionManager: NotionManager<NotionPage>,
    name?: string,
  ) {
    await notionManager.updateSyncStatus();
    if (!name) {
      return;
    }
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: name,
      databaseId: notionManager.databaseId,
      lastSyncTime: new Date().getTime(),
    });
  }

  // This should only be run once at the beginning
  public async linkDatabase(tableName: TableName, databaseId: string) {
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: tableName,
      databaseId,
      lastSyncTime: 0,
    });
  }

  // This should only be run once at the beginning
  public async createEditableMirrorInNotion(
    tableName: TableName,
    pageId: string,
  ) {
    const resolver = NotionSyncResolver.getTableResolver(tableName);
    const notionSyncer = await NotionManager.createDatabase(
      pageId,
      resolver,
      tableName,
    );
    const entities = await resolver.getAllLocalItems();
    await Promise.allSettled(
      entities.map(async entity => {
        try {
          const id = await notionSyncer.create(entity);
          if (id) {
            resolver.updateLinkedLocalItem(entity);
          }
        } catch (e) {
          console.log(`Insert ${entity} failed`);
          throw e;
        }
      }),
    );
    await this.updateLastSyncTime(notionSyncer, tableName);
  }

  /**
   * Sync data from Notion
   *
   * @public
   * @async
   * @param {TableName} tableName
   * @param {number} [lookBackTime=DEFAULT_LOOK_BACK_MS] Sync since how long back from the last sync time. In seconds. -1 means all time
   * @returns {Promise<void>}
   */
  public async syncFromNotion(
    tableName: TableName,
    lookBackTime = DEFAULT_LOOK_BACK_MS,
  ): Promise<void> {
    const logger = this.logger.in("syncFromNotion");
    const tbl = await this.table();
    const sync = await tbl.get(tableName);
    if (!sync) {
      logger.log(`no sync func for ${tableName}`);
      return;
    }

    const resolver = NotionSyncResolver.getTableResolver(tableName);

    const notionSyncer = new NotionManager(sync.databaseId, resolver);
    if (lookBackTime >= 0) {
      const lastUpdated = await notionSyncer.getLastUpdatedTime();
      if (lastUpdated && lastUpdated <= sync.lastSyncTime - lookBackTime) {
        // Only update notion status but not DB sync time as nothing has been updated
        await this.updateLastSyncTime(notionSyncer, tableName);
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
      lookBackTime < 0
        ? allTags
        : allTags.filter(
            (t: any) =>
              new Date(t.last_edited_time).getTime() >
              sync.lastSyncTime - lookBackTime,
          );

    logger.log("Collection done, start updating database");
    const [upsertResults, deleted] = await Promise.all([
      resolver.createOrUpdateLocalItems(updatedOrCreated),
      resolver.deleteNotFoundLocalItems(allTags.map(t => t.id)),
    ]);

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

    await this.updateLastSyncTime(notionSyncer, tableName);
  }
}
