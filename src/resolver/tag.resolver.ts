import _ from "lodash";
import { Resolver } from "type-graphql";
import { I18NText, Tag } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { TagTable } from "./tag-table";
import { v4 as uuid } from "uuid";
import { NotionSyncable } from "../data-sync/notion-manager";

@Resolver(Tag)
export class TagResolver
  extends TableProvider(TagTable)
  implements NotionSyncable<Tag>
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
  public async getPropertiesForItemUpdating(tag: Tag): Promise<any> {
    return this.getPropertiesForItemCreation(tag);
  }

  public async getAllLocalItems() {
    const tbl = await this.table();
    return await tbl.getAllTags();
  }

  public async updateLinkedLocalItem(tag: Tag) {
    const tbl = await this.table();
    return await tbl.updateTag(tag.id, { notionPageId: tag.notionPageId });
  }

  public async createOrUpdateLocalItem(t: any) {
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

  public async deleteNotFoundLocalItems(tagIds: string[]) {
    const tbl = await this.table();
    const deleted = await tbl.queryItemsWorking<Tag>({
      notionPageId: { $nin: tagIds },
    });
    await tbl.deleteItems(deleted.map(t => t.id));
    return deleted;
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
