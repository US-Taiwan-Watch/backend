import _ from "lodash";
import { Resolver } from "type-graphql";
import { Tag } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { TagTable } from "./tag-table";
import { v4 as uuid } from "uuid";
import { CloneToNotion, SyncFromNotion } from "./notion-sync.resolver";
import { UpdateResult } from "mongodb";

@Resolver(Tag)
export class TagResolver
  extends TableProvider(TagTable)
  implements CloneToNotion<Tag>, SyncFromNotion
{
  public getPropertiesForDatabaseCreation() {
    return {
      Name: {
        title: {},
      },
      "Name (zh)": {
        rich_text: {},
      },
    };
  }

  public async getPropertiesForItemCreation(tag: Tag): Promise<any> {
    if (!tag.name.en) {
      return null;
    }
    return {
      Name: {
        title: [
          {
            text: {
              content: tag.name.en,
            },
          },
        ],
      },
      "Name (zh)": {
        rich_text: [
          {
            text: {
              content: tag.name.zh || "",
            },
          },
        ],
      },
    };
  }

  public async getAllLocalItems() {
    const tbl = await this.table();
    return await tbl.getAllTags();
  }

  public async linkLocalItem(tag: Tag, notionPageId: string) {
    const tbl = await this.table();
    return await tbl.updateTag(tag.id, { notionPageId });
  }

  public async createOrUpdateLocalItems(pageObjects: any[]) {
    const tbl = await this.table();
    return await Promise.all(
      pageObjects.map(pageObject =>
        tbl.upsertItemByCustomQuery<Tag>(
          { notionPageId: pageObject.id },
          {
            $set: {
              name: {
                en: pageObject.properties["Name"].title[0]?.text
                  ?.content as string,
                zh: pageObject.properties["Name (zh)"].rich_text[0]?.text
                  ?.content as string,
              },
            },
            $setOnInsert: {
              _id: uuid(),
            },
          },
        ),
      ),
    );
  }

  updateRelations(_pageObjects: any[]): Promise<UpdateResult[]> {
    throw new Error("Method not implemented.");
  }

  public async deleteNotFoundLocalItems(notionPageIds: string[]) {
    const tbl = await this.table();
    const result = await tbl.deleteItemsByCustomQuery({
      notionPageId: { $nin: notionPageIds },
    });
    return result.deletedCount;
  }

  // public async getTagIdsFromNotionIds(notionIds: string[]): Promise<string[]> {
  //   const tbl = await this.table();
  //   return (
  //     await tbl.queryItemsWorking({ notionPageId: { $in: notionIds } }, ["_id"])
  //   ).map(r => r._id);
  // }

  // public async getNotionIdsFromTagIds(ids: any[]): Promise<string[]> {
  //   const tbl = await this.table();
  //   return (
  //     await tbl.queryItemsWorking({ _id: { $in: ids } }, ["notionPageId"])
  //   ).map(r => r.notionPageId);
  // }
}
