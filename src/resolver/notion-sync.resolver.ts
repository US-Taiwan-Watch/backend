import _ from "lodash";
import { NotionSync } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";
import { Logger } from "../util/logger";
import { NotionManager } from "../data-sync/notion-manager";
import { UpdateResult } from "mongodb";

const DEFAULT_LOOK_BACK_MS = 5 * 60 * 1000;
export interface SyncToNotion<T> {
  getTableName(): Promise<string>;
  getAllLocalItems(): Promise<T[]>;
  getPropertiesForDatabaseCreation(): any;
  getPropertiesForItemCreation(entity: T): Promise<any>;
  getPropertiesForItemUpdate(entity: T): Promise<any>;
  linkLocalItem(entity: T, notionPageId: string): Promise<UpdateResult>;
}

export interface SyncFromNotion {
  getTableName(): Promise<string>;
  createOrUpdateLocalItems(pageObjects: any[]): Promise<UpdateResult[]>;
  deleteNotFoundLocalItems(notionPageIds: string[]): Promise<any[]>;
}

type Entity = {
  id: string;
};

export class NotionSyncResolver<T extends Entity> extends TableProvider(
  NotionSyncTable,
) {
  private resolver: SyncToNotion<T> | SyncFromNotion;
  private syncToNotionResolver?: SyncToNotion<T>;
  private syncFromNotionResolver?: SyncFromNotion;

  constructor(
    private className: new () => SyncToNotion<T> | SyncFromNotion,
    private logger = new Logger("NotionSyncResolver"),
  ) {
    super();
    this.resolver = new className();
    this.syncToNotionResolver = this.resolver as SyncToNotion<T>;
    this.syncFromNotionResolver = this.resolver as SyncFromNotion;
  }

  private async getNotionSyncId() {
    return this.resolver.getTableName();
  }

  private getSyncToNotionResolver(): SyncToNotion<T> {
    if (this.syncToNotionResolver) {
      return this.syncToNotionResolver;
    }
    throw Error("resolver does not implement SyncToNotion");
  }

  private getSyncFromNotionResolver(): SyncFromNotion {
    if (this.syncFromNotionResolver) {
      return this.syncFromNotionResolver;
    }
    throw Error("resolver does not implement SyncFromNotion");
  }

  private async updateLastSyncTime(notionManager: NotionManager) {
    await notionManager.updateSyncStatus();
    const tbl = await this.table();
    return await tbl.createOrReplace({
      id: await this.getNotionSyncId(),
      databaseId: notionManager.databaseId,
      lastSyncTime: new Date().getTime(),
    });
  }

  private async unlinkNotionDatabase() {
    try {
      const sync = await this.getNotionSyncInfo();
      const notionManager = new NotionManager(sync.databaseId);
      notionManager.updateDatabaseTitle(`[Unlinked] ${sync.id}`);
    } catch (e) {
      this.logger
        .in("unlinkNotionDatabase")
        .log(`Failed for resolver ${this.className.name}`);
    }
  }

  /**
   * * This should only be run once at the beginning if the notion database exists already
   *
   * @public
   * @async
   * @param {TableName} tableName
   * @param {string} databaseId
   * @returns {*}
   */
  public async linkDatabase(databaseId: string) {
    this.unlinkNotionDatabase();
    const tbl = await this.table();
    await tbl.createOrReplace({
      id: await this.getNotionSyncId(),
      databaseId,
      lastSyncTime: 0,
    });
  }

  /**
   * This should only be run once at the beginning if the notion database does not exist
   *
   * @public
   * @async
   * @param {TableName} tableName
   * @param {string} pageId
   * @returns {*}
   */
  public async createEditableMirrorInNotion(pageId: string) {
    const resolver = this.getSyncToNotionResolver();
    const notionManager = await NotionManager.createDatabase(
      pageId,
      await this.getNotionSyncId(),
      resolver.getPropertiesForDatabaseCreation(),
    );
    await this.unlinkNotionDatabase();
    await this.insertAllToNotion(notionManager);
  }

  /**
   * This should only be run when the notion database is linked but empty
   *
   * @public
   * @async
   * @param {TableName} tableName
   * @param {?SyncToNotion<any>} [resolver]
   * @param {?NotionManager} [notionManager]
   * @returns {*}
   */
  public async insertAllToNotion(notionManager?: NotionManager) {
    if (!notionManager) {
      const sync = await this.getNotionSyncInfo();
      notionManager = new NotionManager(sync.databaseId);
    }
    const resolver = this.getSyncToNotionResolver();
    const entities = await resolver.getAllLocalItems();
    await Promise.allSettled(
      entities.map(async entity => {
        try {
          const properties = await resolver?.getPropertiesForItemCreation(
            entity,
          );
          const id = await notionManager?.create(properties);
          if (id) {
            resolver?.linkLocalItem(entity, id);
          }
        } catch (e) {
          this.logger.in("insertAllToNotion").log(`Insert ${entity.id} failed`);
          throw e;
        }
      }),
    );
    await this.updateLastSyncTime(notionManager);
  }

  public async syncEntityToNotion(notionPageId: string, entity: T) {
    const sync = await this.getNotionSyncInfo();
    const notionManager = new NotionManager(sync.databaseId);
    const resolver = this.getSyncToNotionResolver();
    try {
      const properties = await resolver?.getPropertiesForItemUpdate(entity);
      await notionManager?.update(notionPageId, properties);
    } catch (e) {
      this.logger.in("syncEntityToNotion").log(`Update ${entity.id} failed`);
      throw e;
    }
    await this.updateLastSyncTime(notionManager);
  }

  private async getNotionSyncInfo(): Promise<NotionSync> {
    const tbl = await this.table();
    const sync = await tbl.get(await this.getNotionSyncId());
    if (!sync) {
      throw Error("notion sync info not found");
    }
    return sync;
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
    lookBackTime = DEFAULT_LOOK_BACK_MS,
  ): Promise<void> {
    const sync = await this.getNotionSyncInfo();
    const logger = this.logger.in("syncFromNotion");

    const notionManager = new NotionManager(sync.databaseId);
    if (lookBackTime >= 0) {
      const lastUpdated = await notionManager.getLastUpdatedTime();
      if (lastUpdated && lastUpdated <= sync.lastSyncTime - lookBackTime) {
        // Only update notion status but not DB sync time as nothing has been updated
        await this.updateLastSyncTime(notionManager);
        logger.log(
          `Skipped. last edited time: ${new Date(
            lastUpdated || 0,
          )} and last sync time: ${new Date(sync.lastSyncTime)}`,
        );
        return;
      }
    }
    logger.log("Started");
    const allTags = await notionManager.queryAll();

    const updatedOrCreated =
      lookBackTime < 0
        ? allTags
        : allTags.filter(
            (t: any) =>
              new Date(t.last_edited_time).getTime() >
              sync.lastSyncTime - lookBackTime,
          );

    logger.log("Collection done, start updating database");

    const resolver = this.getSyncFromNotionResolver();
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

    await this.updateLastSyncTime(notionManager);
  }
}
