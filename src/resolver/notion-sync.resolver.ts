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

export enum NotionDatabase {
  TAGS = "Tags",
  ARTICLES = "Articles",
}

@Resolver()
export class NotionSyncResolver extends TableProvider(NotionSyncTable) {
  constructor(private logger = new Logger("NotionSyncResolver")) {
    super();
  }

  private static getTableResolver(
    name: NotionDatabase,
  ): NotionSyncable<NotionPage> {
    switch (name) {
      case NotionDatabase.TAGS:
        return new TagResolver();
      case NotionDatabase.ARTICLES:
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
  public async linkDatabase(databaseName: NotionDatabase, databaseId: string) {
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: databaseName,
      databaseId,
      lastSyncTime: 0,
    });
  }

  // This should only be run once at the beginning
  public async createEditableMirrorInNotion(
    databaseName: NotionDatabase,
    pageId: string,
  ) {
    const resolver = NotionSyncResolver.getTableResolver(databaseName);
    const notionSyncer = await NotionManager.createDatabase(
      pageId,
      resolver,
      databaseName,
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
    await this.updateLastSyncTime(notionSyncer, databaseName);
  }

  public async syncWithNotion(
    databaseName: NotionDatabase,
    lookBackTime = DEFAULT_LOOK_BACK_MS,
  ) {
    const tbl = await this.table();
    const sync = await tbl.get(databaseName);
    if (!sync) {
      return;
    }
    const logger = this.logger.in("syncWithNotion");

    const resolver = NotionSyncResolver.getTableResolver(databaseName);

    const notionSyncer = new NotionManager(sync.databaseId, resolver);
    if (lookBackTime >= 0) {
      const lastUpdated = await notionSyncer.getLastUpdatedTime();
      if (lastUpdated && lastUpdated <= sync.lastSyncTime - lookBackTime) {
        // Only update notion status but not DB sync time as nothing has been updated
        await this.updateLastSyncTime(notionSyncer, databaseName);
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

    await this.updateLastSyncTime(notionSyncer, databaseName);
  }
}
