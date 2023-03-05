import _ from "lodash";
import { Resolver } from "type-graphql";
import { Tag } from "../../common/models";
import { NotionTagManager } from "../data-sync/notion-tag-manager";
import { TableProvider } from "../mongodb/mongodb-manager";
import { NotionSyncResolver } from "./notion-sync.resolver";
import { TagTable } from "./tag-table";

@Resolver(Tag)
export class TagResolver extends TableProvider(TagTable) {
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
    await this.updateNotionSyncTime();
  }

  public async updateNotionSyncTime() {
    const syncResolver = new NotionSyncResolver();
    await syncResolver.updateLastSyncTime(NotionTagManager.DATABASE_NAME);
  }

  // public async syncLatestFromNotion() {
  //   const notionSyncer = new NotionTagManager();
  //   notionSyncer.queryAll;
  // }

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
