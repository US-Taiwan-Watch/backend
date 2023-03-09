import { Client } from "@notionhq/client";
import { QueryDatabaseParameters } from "@notionhq/client/build/src/api-endpoints";
import { UpdateResult } from "mongodb";
import { NotionPage } from "../../common/models";

export interface NotionSyncable<T extends NotionPage> {
  // For Notion item management
  getAllLocalItems(): Promise<T[]>;
  getPropertiesForDatabaseCreation(): any;
  getPropertiesForItemCreation(entity: T): Promise<any>;
  getPropertiesForItemUpdating(entity: T): Promise<any>;
  // Local item management
  updateLinkedLocalItem(entity: T): Promise<UpdateResult>;
  createOrUpdateLocalItems(pageObjects: any[]): Promise<UpdateResult[]>;
  deleteNotFoundLocalItems(notionPageIds: string[]): Promise<any[]>;
}

export class NotionManager<T extends NotionPage> {
  private notionClient: Client;

  private static getClient() {
    return new Client({
      auth: process.env.NOTION_API_KEY,
    });
  }

  constructor(
    public readonly databaseId: string,
    private resolver: NotionSyncable<T>,
  ) {
    this.notionClient = NotionManager.getClient();
  }

  private static async retry<V>(fn: () => Promise<V>, count = 10) {
    try {
      return await fn();
    } catch (e) {
      if (count > 0) {
        return await fn();
      }
      return null;
    }
  }

  public static async createDatabase<T extends NotionPage>(
    pagdId: string,
    resolver: NotionSyncable<T>,
    name: string,
  ) {
    console.log(resolver.getPropertiesForDatabaseCreation());
    const res = await this.getClient().databases.create({
      parent: { type: "page_id", page_id: pagdId },
      title: [
        {
          type: "text",
          text: {
            content: name,
          },
        },
      ],
      properties: resolver.getPropertiesForDatabaseCreation(),
    });
    return new this(res.id, resolver);
  }

  private async queryAllPages(query: QueryDatabaseParameters) {
    let res = await this.notionClient.databases.query(query);
    let results = res.results;
    while (res.next_cursor) {
      res = await this.notionClient.databases.query({
        ...query,
        start_cursor: res.next_cursor,
      });
      results = [...results, ...res.results];
    }
    return results;
  }

  public queryAll() {
    return this.queryAllPages({
      database_id: this.databaseId,
    });
  }

  public async queryUpdatedAfter(timestamp: number) {
    return this.queryAllPages({
      database_id: this.databaseId,
      filter: {
        and: [
          {
            timestamp: "last_edited_time",
            last_edited_time: { after: new Date(timestamp).toISOString() },
          },
          {
            timestamp: "created_time",
            created_time: { on_or_before: new Date(timestamp).toISOString() },
          },
        ],
      },
    });
  }

  public async queryCreatedAfter(timestamp: number) {
    return this.queryAllPages({
      database_id: this.databaseId,
      filter: {
        timestamp: "created_time",
        created_time: { after: new Date(timestamp).toISOString() },
      },
    });
  }

  public async updateSyncStatus() {
    this.notionClient.databases.update({
      database_id: this.databaseId,
      description: [
        { text: { content: "Last synced at " } },
        {
          type: "mention",
          mention: {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
      ],
    });
  }

  public async queryUpdatedBefore(timestamp: number) {
    return this.queryAllPages({
      database_id: this.databaseId,
      filter: {
        timestamp: "last_edited_time",
        last_edited_time: { on_or_before: new Date(timestamp).toISOString() },
      },
    });
  }

  public async getLastUpdatedTime() {
    const database = await this.notionClient.databases.retrieve({
      database_id: this.databaseId,
    });
    if ("last_edited_time" in database) {
      return new Date(database.last_edited_time).getTime();
    }
  }

  public delete(pageId: string) {
    return this.notionClient.pages.update({ page_id: pageId, archived: true });
  }

  public async deleteAll() {
    const res = await this.queryAll();
    return await Promise.allSettled(res.map(page => this.delete(page.id)));
  }

  public async create(entity: T): Promise<string | null> {
    const properties = await this.resolver.getPropertiesForItemCreation(entity);
    if (!properties) {
      return null;
    }
    const res = await NotionManager.retry(
      async () =>
        await this.notionClient.pages.create({
          parent: { database_id: this.databaseId },
          properties,
        }),
    );
    return res && res.id;
  }

  public async update(entity: T) {
    const properties = await this.resolver.getPropertiesForItemUpdating(entity);
    if (!properties) {
      return null;
    }
    if (!entity.notionPageId) {
      return null;
    }
    const res = await NotionManager.retry(
      async () =>
        await this.notionClient.pages.update({
          page_id: entity.notionPageId!,
          properties,
        }),
    );
    return res && res.id;
  }
}
