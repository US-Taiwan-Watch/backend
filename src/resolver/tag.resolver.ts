import _ from "lodash";
import { Resolver } from "type-graphql";
import { I18NText, NotionPage, Tag } from "../../common/models";
import { NotionManager } from "../data-sync/notion-manager";
import { NotionTagManager } from "../data-sync/notion-tag-manager";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncResolver } from "./notion-sync.resolver";
import { TagTable } from "./tag-table";
import { v4 as uuid } from "uuid";
import { UpdateResult } from "mongodb";

export interface SyncWithNotion<T extends NotionPage> {
  getNotionManager(databaseId: string): NotionManager<T>;
  // getPropertiesForDatabaseCreation(): any;
  // getPropertiesForCreation(_entity: T): Promise<any>;
  // getPropertiesForUpdating(_entity: T): Promise<any>;
  createOrUpdateItemFromNotion(t: any): Promise<UpdateResult>;
  deleteItemsNotFoundInNotion(tagIds: string[]): Promise<T[]>;
}

@Resolver(Tag)
export class TagResolver
  extends TableProvider(TagTable)
  implements SyncWithNotion<Tag>
{
  // This should only be run once at the beginning
  public async createEditableMirrorInNotion(pageId: string) {
    const tbl = await this.table();
    const tags = await tbl.getAllTags();
    const databaseId = await NotionTagManager.createDatabase(pageId);
    const notionSyncer = new NotionTagManager(databaseId);
    await Promise.allSettled(
      tags.map(async tag => {
        try {
          const id = await notionSyncer.create(tag);
          if (id) {
            tbl.updateTag(tag.id, { notionPageId: id });
          }
        } catch (e) {
          console.log(`Insert ${tag.id} failed`);
          throw e;
        }
      }),
    );
    await this.updateNotionSyncTime(databaseId);
  }

  public async getAllItems() {
    const tbl = await this.table();
    return await tbl.getAllTags();
  }

  public getNotionManager(databaseId: string) {
    return new NotionTagManager(databaseId);
  }

  private async updateNotionSyncTime(databaseId: string) {
    const syncResolver = new NotionSyncResolver();
    await syncResolver.updateLastSyncTime(
      NotionTagManager.DATABASE_NAME,
      databaseId,
    );
  }

  public async createOrUpdateItemFromNotion(t: any) {
    const tbl = await this.table();
    return await tbl.upsertItemByCustomQuery<Tag>(
      { notionPageId: t.id },
      {
        $set: {
          name: I18NText.create(
            t.properties["Name"].title[0]?.text?.content as string,
            t.properties["Name (zh)"].rich_text[0]?.text?.content as string,
          ),
        },
        $setOnInsert: {
          _id: uuid(),
        },
      },
    );
  }

  public async deleteItemsNotFoundInNotion(tagIds: string[]) {
    const tbl = await this.table();
    const deleted = await tbl.queryItemsWorking<Tag>({
      notionPageId: { $nin: tagIds },
    });
    await tbl.deleteItems(deleted.map(t => t.id));
    return deleted;
  }

  public async getTagIdsFromNotionIds(notionIds: string[]): Promise<string[]> {
    const tbl = await this.table();
    return (
      await tbl.queryItemsWorking({ notionPageId: { $in: notionIds } }, ["_id"])
    ).map(r => r._id);
  }

  public async getNotionIdsFromTagIds(ids: any[]): Promise<string[]> {
    const tbl = await this.table();
    return (
      await tbl.queryItemsWorking({ _id: { $in: ids } }, ["notionPageId"])
    ).map(r => r.notionPageId);
  }
}
