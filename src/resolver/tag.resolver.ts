import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import _, { update } from "lodash";
import { Resolver } from "type-graphql";
import { I18NText, Tag } from "../../common/models";
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
    await this.updateNotionSyncTime(databaseId);
  }

  public async updateNotionSyncTime(databaseId: string) {
    const syncResolver = new NotionSyncResolver();
    await syncResolver.updateLastSyncTime(
      NotionTagManager.DATABASE_NAME,
      databaseId,
    );
  }

  public async syncFromNotion() {
    const syncResolver = new NotionSyncResolver();
    const sync = await syncResolver.getLastSync(NotionTagManager.DATABASE_NAME);
    if (!sync) {
      return;
    }
    const notionSyncer = new NotionTagManager(sync.databaseId);
    const lastUpdated = await notionSyncer.getLastUpdatedTime();
    if (lastUpdated && lastUpdated <= sync.lastSyncTime) {
      // Only update notion status but not DB sync time as nothing has been updated
      notionSyncer.updateSyncStatus();
      return;
    }
    const [tbl, created, updated, rest] = await Promise.all([
      this.table(),
      notionSyncer.queryCreatedAfter(sync.lastSyncTime),
      notionSyncer.queryUpdatedAfter(sync.lastSyncTime),
      notionSyncer.queryUpdatedBefore(sync.lastSyncTime),
    ]);
    const deleted = await tbl.queryItemsWorking<Tag>({
      notionPageId: { $nin: rest.concat(updated).map(t => t.id) },
    });

    console.log(created);
    console.log(updated);
    console.log(deleted);

    const jobs: Promise<any>[] = updated.map((t: any) =>
      tbl.updateItemByCustomQuery<Tag>(
        { notionPageId: t.id },
        {
          $set: {
            name: I18NText.create(
              t.properties["Name"].title[0].text.content as string,
              t.properties["Name (zh)"].rich_text[0].text.content as string,
            ),
          },
        },
      ),
    );
    if (created.length > 0) {
      jobs.push(
        tbl.addItems<Tag>(
          created.map((t: any) => ({
            name: I18NText.create(
              t.properties["Name"].title[0]?.text?.content as string,
              t.properties["Name (zh)"].rich_text[0]?.text?.content as string,
            ),
            notionPageId: t.id,
          })),
        ),
      );
    }
    if (deleted.length > 0) {
      jobs.push(tbl.deleteItems(deleted.map(t => t.id)));
    }
    jobs.push(this.updateNotionSyncTime(sync.databaseId));

    await Promise.all(jobs);
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
