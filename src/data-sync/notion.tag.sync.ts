import { Tag } from "../../common/models";
import { NotionSyncer } from "./notion.entity.sync";

export class NotionTagSyncer extends NotionSyncer<Tag> {
  protected databaseId = "5f2925fe2cbc4b9cb2bf94a55921814d";

  protected getPropertiesForCreation(tag: Tag) {
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
}
