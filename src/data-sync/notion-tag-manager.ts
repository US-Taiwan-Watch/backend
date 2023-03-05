import { Tag } from "../../common/models";
import { NotionManager } from "./notion-manager";

export class NotionTagManager extends NotionManager<Tag> {
  public static readonly DATABASE_NAME = "Tags";

  protected static getPropertiesForDatabaseCreation() {
    return {
      Name: {
        title: {},
      },
      "Name (zh)": {
        rich_text: {},
      },
    };
  }

  protected async getPropertiesForCreation(tag: Tag) {
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

  // protected async getPropertiesForUpdating(tag: Tag) {
  //   if (!tag.name.en) {
  //     return null;
  //   }
  //   return {
  //     syncID: {
  //       rich_text: [
  //         {
  //           text: {
  //             content: tag.id,
  //           },
  //         },
  //       ],
  //     },
  //   };
  // }
}
