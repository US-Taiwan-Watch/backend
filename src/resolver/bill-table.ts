import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Bill, BillType } from "../../common/models";
import * as _ from "lodash";

export class BillTable extends MongoDBTableBase("bills") {
  public addBill(bill: Bill) {
    return this.putItem(bill);
  }

  public async getAllBills(): Promise<Bill[]> {
    return await this.getAllItems<Bill>();
  }

  public getBill(
    id: string,
    ...attrNamesToGet: (keyof Bill)[]
  ): Promise<Bill | null> {
    return this.getItem('_id', id, attrNamesToGet);
  }

  public async getBillsByCongress(...congresses: number[]): Promise<Bill[]> {
    return await this.queryItemsWorking({
      'congress': { $in: congresses },
      'versions.code': { $ne: 'pl' }
    });
  }

  public async getBillsThatNeedDownload(): Promise<Bill[]> {
    return await this.queryItemsWorking({
      versions: { $exists: true },
      $or: [
        { "versions.downloaded.txt": undefined },
        { "versions.downloaded.pdf": undefined },
        { "versions.downloaded.xml": undefined },
      ]
    });
  }

  public async getBillsThatNeedSync(): Promise<Bill[]> {
    return await this.queryItemsWorking({
      'needsSync': { $ne: false },
      'manualSync': { $ne: true }
    });
  }

  public async getBills(ids: string[], ...attrNamesToGet: (keyof Bill)[]): Promise<Bill[]> {
    return await this.getItems<Bill>('_id', ids, attrNamesToGet);
  }

  public updateBill(id: string, update: Partial<Bill>) {
    return this.updateItemByObjectId<Bill>(id, update);
  }

  public async createOrReplaceBill(bill: Bill) {
    const existing = await this.getBill(bill.id);
    if (existing) {
      const { id, ...updateBill } = bill;
      this.updateBill(bill.id, updateBill);
    } else {
      this.addBill(bill);
    }
  }

}
