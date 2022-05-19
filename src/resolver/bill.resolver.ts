import _ from "lodash";
import { Resolver, Query, Arg } from "type-graphql";
import { Bill, BillType } from "../../common/models";
import { BillSyncer } from "../data-sync/bill.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { BillTable } from "./bill-table";

@Resolver(Bill)
export class BillResolver extends TableProvider(BillTable) {
  @Query(() => [Bill], { nullable: false })
  public async bills(): Promise<Bill[]> {
    const tbl = await this.table();
    return await tbl.getAllBills();
  }

  @Query(() => Bill, { nullable: true })
  public async bill(
    @Arg('congress') congress: number,
    @Arg('billType') billType: BillType,
    @Arg('billNumber') billNumber: number,
  ): Promise<Bill | null> {
    const tbl = await this.table();
    return await tbl.getBill(congress, billType, billNumber);
  }

  public async syncBill(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    return await new BillSyncer(bill, fields).sync();
  }

  public async syncBillWithKeys(
    congress: number,
    billType: BillType,
    billNumber: number,
    fields: (keyof Bill)[]
  ): Promise<Bill | null> {
    let bill = await this.bill(congress, billType, billNumber);
    if (!bill) {
      return null;
    }
    await new BillSyncer(bill, fields).sync();
    // TODO: save update to DB
    return bill;
  }

}
