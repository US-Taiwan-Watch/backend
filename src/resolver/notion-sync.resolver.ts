import _ from "lodash";
import { NotionSync } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncTable } from "./notion-sync-table";
import { Logger } from "../util/logger";
import { NotionManager } from "../data-sync/notion-manager";
import { UpdateResult } from "mongodb";
import { executePromisesAllSettledWithConcurrency } from "../../common/utils/concurrency-utils";
import { ArticleResolver } from "./article.resolver";
import { Arg, Mutation, Resolver, registerEnumType } from "type-graphql";

const DEFAULT_LOOK_BACK_MS = 5 * 60 * 1000;

export enum NotionSyncType {
  ARTICLE = "articles",
}

registerEnumType(NotionSyncType, {
  name: "NotionSyncType",
});

export interface NotionSyncable {
  getTableName(): Promise<string>;
}

export interface CloneToNotion<T> extends NotionSyncable {
  getAllLocalItems(): Promise<T[]>;
  getPropertiesForDatabaseCreation(): any;
  getPropertiesForItemCreation(entity: T): Promise<any>;
  linkLocalItem(entity: T, notionPageId: string): Promise<UpdateResult>;
}

export interface SyncToNotion<T> extends NotionSyncable {
  getUpdatedLocalItems(lastUpdated: number): Promise<T[]>;
  getPropertiesForItemUpdate(entity: T): Promise<any>;
}

export interface SyncFromNotion extends NotionSyncable {
  createOrUpdateLocalItems(pageObjects: any[]): Promise<UpdateResult[]>;
  updateRelations(pageObjects: any[]): Promise<UpdateResult[]>;
  deleteNotFoundLocalItems(notionPageIds: string[]): Promise<number>;
}

type Entity = {
  id: string;
  notionPageId?: string;
};

@Resolver()
export class NotionSyncResolver<T extends Entity> extends TableProvider(
  NotionSyncTable,
) {
  private resolver!: NotionSyncable;
  private className!: new () => NotionSyncable;

  constructor(
    className?: new () => NotionSyncable,
    private logger = new Logger("NotionSyncResolver"),
  ) {
    super();
    if (className) {
      this.resolver = new className();
    }
  }

  private getResolverClass(type: NotionSyncType) {
    switch (type) {
      case NotionSyncType.ARTICLE:
        return ArticleResolver;
    }
  }

  private setResolver(className: new () => NotionSyncable): this {
    this.resolver = new className();
    return this;
  }

  private async getNotionSyncId() {
    return this.resolver.getTableName();
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
      await notionManager.updateDatabaseTitle(`[Unlinked] ${sync.id}`);
    } catch (e) {
      this.logger
        .in("unlinkNotionDatabase")
        .log(`Failed for resolver ${this.className.name}`);
    }
  }

  @Mutation(() => Boolean, { name: "syncFromNotion" })
  public async syncFromNotionMutation(
    @Arg("type", () => NotionSyncType, { nullable: false })
    type: NotionSyncType,
  ): Promise<boolean> {
    this.setResolver(this.getResolverClass(type));
    await this.syncFromNotion();
    return true;
  }

  /**
   * This should only be run once at the beginning if the notion database exists already
   *
   * @public
   * @async
   * @param {string} databaseId
   * @returns {*}
   */
  public async linkDatabase(databaseId: string) {
    await this.unlinkNotionDatabase();
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
   * @param {string} pageId
   * @returns {*}
   */
  public async createEditableMirrorInNotion(pageId: string) {
    const resolver = this.resolver as CloneToNotion<T>;
    const notionManager = await NotionManager.createDatabase(
      pageId,
      await this.getNotionSyncId(),
      resolver.getPropertiesForDatabaseCreation(),
    );
    await this.linkDatabase(notionManager.databaseId);
  }

  /**
   * This should only be run when the notion database is linked but empty
   *
   * @public
   * @async
   * @param {?NotionManager} [notionManager]
   * @returns {*}
   */
  public async insertAllToNotion(notionManager?: NotionManager) {
    const resolver = this.resolver as CloneToNotion<T>;
    if (!notionManager) {
      const sync = await this.getNotionSyncInfo();
      notionManager = new NotionManager(sync.databaseId);
    }
    const entities = await resolver.getAllLocalItems();
    await executePromisesAllSettledWithConcurrency(
      entities.map(async entity => {
        try {
          const properties = await resolver.getPropertiesForItemCreation(
            entity,
          );
          const id = await notionManager?.create(properties);
          if (id) {
            await resolver.linkLocalItem(entity, id);
          }
        } catch (e) {
          this.logger
            .in("insertAllToNotion")
            .log(`Failed to insert ${entity.id}`);
        }
      }),
      2,
    );
    await this.updateLastSyncTime(notionManager);
  }

  public async syncAll() {
    if (this.resolver as SyncFromNotion) {
      await this.syncFromNotion(DEFAULT_LOOK_BACK_MS, false);
    }
    if (this.resolver as SyncToNotion<T>) {
      await this.syncToNotion();
    }
  }

  private async getNotionSyncInfo(): Promise<NotionSync> {
    const tbl = await this.table();
    const sync = await tbl.get(await this.getNotionSyncId());
    if (!sync) {
      throw Error("notion sync info not found");
    }
    return sync;
  }

  public async syncToNotion(updateSyncTime = true) {
    const resolver = this.resolver as SyncToNotion<T>;
    const sync = await this.getNotionSyncInfo();
    const notionManager = new NotionManager(sync.databaseId);
    const entities = await resolver.getUpdatedLocalItems(sync.lastSyncTime);

    const logger = this.logger.in("syncToNotion");
    await Promise.all(
      entities.map(async entity => {
        try {
          const properties = await resolver.getPropertiesForItemUpdate(entity);
          if (entity.notionPageId) {
            await notionManager?.update(entity.notionPageId, properties);
          }
        } catch (e) {
          logger.log(`Update ${entity.id} failed`);
          throw e;
        }
      }),
    );
    logger.log(`Updated count: ${entities.length}`);
    if (updateSyncTime) {
      await this.updateLastSyncTime(notionManager);
    }
  }

  public async createCopyFromNotion(databaseId: string) {
    await this.linkDatabase(databaseId);
    await this.syncFromNotion();
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
    updateSyncTime = true,
  ): Promise<void> {
    const resolver = this.resolver as SyncFromNotion;

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
    const allPages = await notionManager.queryAll();
    logger.log(`Collection done, totally ${allPages.length} items`);

    const updatedOrCreated =
      lookBackTime < 0
        ? allPages
        : allPages.filter(
            (t: any) =>
              new Date(t.last_edited_time).getTime() >
              sync.lastSyncTime - lookBackTime,
          );

    logger.log(
      `Start updating database with ${updatedOrCreated.length} updated or created`,
    );

    const [upsertResults, deletedCount] = await Promise.all([
      resolver.createOrUpdateLocalItems(updatedOrCreated),
      resolver.deleteNotFoundLocalItems(allPages.map(t => t.id)),
    ]);

    const updateRelationsResults = await resolver.updateRelations(
      updatedOrCreated,
    );

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
    logger.log(
      `Updated Relations count: ${updateRelationsResults.reduce(
        (acc, u) => acc + u.modifiedCount,
        0,
      )}`,
    );
    logger.log(`Deleted count: ${deletedCount}`);

    if (updateSyncTime) {
      await this.updateLastSyncTime(notionManager);
    }
  }
}
