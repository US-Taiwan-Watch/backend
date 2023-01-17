import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Bill, BillType } from "../../common/models";
import * as _ from "lodash";

export class BillTable extends MongoDBTableBase("bills") {
  public addBill(bill: Bill) {
    return this.putItem(bill);
  }

  public async getAllBills(): Promise<Bill[]> {
    return await this.getItemsByMultiKeys<Bill>(["deleted"], [{ $ne: true }]);
  }

  public async searchBills(keywords: string[]): Promise<Bill[]> {
    const fields = [
      "congressStr",
      "billType",
      "billNumberStr",
      "introducedDate",
      "title.en",
      "title.zh",
      "summary.en",
      "summary.zh",
    ];

    return this.getTable()
      .aggregate([
        {
          $addFields: {
            congressStr: {
              $toString: "$congress",
            },
            billNumberStr: {
              $toString: "$billNumber",
            },
          },
        },
        {
          $match: {
            deleted: { $ne: true },
            $and: keywords.map(k => ({
              $or: fields.map(field => ({
                [field]: { $regex: new RegExp(k, "i") },
              })),
            })),
          },
        },
      ])
      .toArray()
      .then(res => this.addBackIdField(res) as Bill[]);
  }

  public getBill(
    id: string,
    ...attrNamesToGet: (keyof Bill)[]
  ): Promise<Bill | null> {
    return this.getItemByMultiKeys(
      ["_id", "deleted"],
      [id, { $ne: true }],
      attrNamesToGet,
    );
  }

  public async getBillsByCongress(...congresses: number[]): Promise<Bill[]> {
    return await this.queryItemsWorking({
      congress: { $in: congresses },
      "versions.code": { $ne: "pl" },
    });
  }

  public async getBillsThatNeedDownload(): Promise<Bill[]> {
    return await this.queryItemsWorking({
      versions: { $exists: true },
      $or: [
        { "versions.downloaded.txt": undefined },
        { "versions.downloaded.pdf": undefined },
        { "versions.downloaded.xml": undefined },
      ],
    });
  }

  public async getBillsThatNeedSync(): Promise<Bill[]> {
    return await this.queryItemsWorking({
      needsSync: { $ne: false },
      manualSync: { $ne: true },
    });
  }

  public async getBills(
    ids: string[],
    ...attrNamesToGet: (keyof Bill)[]
  ): Promise<Bill[]> {
    return await this.getItems<Bill>("_id", ids, attrNamesToGet);
  }

  public updateBill(id: string, update: Partial<Bill>) {
    return this.updateItemByObjectId<Bill>(id, update);
  }

  public async createOrReplaceBill(bill: Bill) {
    const existing = await this.getBill(bill.id);
    if (existing) {
      const { id, ...updateBill } = bill;
      await this.updateBill(bill.id, updateBill);
    } else {
      await this.addBill(bill);
    }
  }
}
