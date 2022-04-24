import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Bill, BillType } from "../../common/models";
import * as _ from "lodash";

export class BillTable extends MongoDBTableBase("bills") {
  public addBill(bill: Bill) {
    return this.putItem(bill);
  }

  public async getAllBills(): Promise<Bill[]> {
    return await this.getAllItems<Bill>();
    // return await this.queryItemsWorking({ 'bioGuideId': { $ne: null } });
  }

  public getBill(
    congress: number,
    billType: BillType,
    billNumber: number,
    ...attrNamesToGet: (keyof Bill)[]
  ): Promise<Bill | null> {
    return this.getItemByMultiKeys<Bill>(
      ['congress', 'billType', 'billNumber'],
      [congress, billType, billNumber],
      attrNamesToGet
    );
  }

  // public updateBill(id: string, update: Partial<User>) {
  // this.updateItemByCustomQuery()
  // return this.updateItemByObjectId<User>(id, update);
  // }

}
