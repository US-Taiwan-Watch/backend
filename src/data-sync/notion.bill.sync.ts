import { Bill } from "../../common/models";
import { NotionSyncer } from "./notion.entity.sync";

export class NotionBillSyncer extends NotionSyncer<Bill> {
  protected databaseId = "f983739ee3f848539576eaf4ee9b4385";

  protected getPropertiesForCreation(bill: Bill) {
    if (!bill.id) {
      return null;
    }
    return {
      "Congress-type-number": {
        title: [
          {
            text: {
              content: bill.id,
            },
          },
        ],
      },
      "Introduce Date": {
        type: "rich_text",
        rich_text: [
          {
            text: {
              content: bill.introducedDate || "",
            },
          },
        ],
      },
      Congress: {
        select: {
          name: bill.congress.toString(),
        },
      },
      "Bill type": {
        select: {
          name: bill.billType,
        },
      },
      "Bill number": {
        number: bill.billNumber,
      },
      "Title (En)": {
        rich_text: [
          {
            text: {
              content: bill.title?.en || "",
            },
          },
        ],
      },
      "Summary (En)": {
        rich_text: [
          {
            text: {
              content: bill.summary?.en || "",
            },
          },
        ],
      },
      標題: {
        type: "rich_text",
        rich_text: [
          {
            text: {
              content: bill.title?.zh || "",
            },
          },
        ],
      },
      總結: {
        type: "rich_text",
        rich_text: [
          {
            text: {
              content: bill.summary?.zh || "",
            },
          },
        ],
      },
      "Last synced time": {
        date: {
          start: bill.lastSynced
            ? new Date(bill.lastSynced).toISOString()
            : null,
        },
      },
      // TODO
      // Tags: {
      //   relation: [
      //     {
      //       id: "66907eb9-3a19-4cc9-b8b2-d9a67228ae53",
      //     },
      //   ],
      // },
      "Sync status": {
        status: {
          name: bill.status,
        },
      },
      // URL: {
      //   url: 'https://???',
      // },
    };
  }
}
