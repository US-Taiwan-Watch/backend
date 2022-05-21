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
    @Arg('id') id: string,
  ): Promise<Bill | null> {
    const tbl = await this.table();
    return await tbl.getBill(id);
  }

  public async addBill(
    congress: number,
    billType: BillType,
    billNumber: number,
  ): Promise<Bill | null> {
    const tbl = await this.table();
    const bill = Bill.fromKeys(congress, billType, billNumber);
    await tbl.createOrReplaceBill(bill);
    return this.bill(bill.id);
  }

  // For one-time use
  public async syncAllBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    let bills = await tbl.getAllBills();
    bills = await Promise.all(bills.map(bill =>
      // Add some fields
      this.syncBill(bill, fields, true)
    ));
    return bills;
  }

  public async syncBillWithId(
    id: string,
    fields: (keyof Bill)[]
  ): Promise<Bill | null> {
    return this.syncBill(Bill.fromId(id), fields, false);
  }

  private async syncBill(bill: Bill, fields?: (keyof Bill)[], skipDB = false): Promise<Bill> {
    if (!skipDB) {
      bill = await this.bill(bill.id) || bill;
    }
    try {
      await new BillSyncer(bill, fields).sync();
      // TODO: save update to DB
    } catch (e) {
      console.log(`Cannot sync bill ${bill.id}`);
    }
    return bill;
  }

  private async syncBills(bills: Bill[], fields?: (keyof Bill)[], skipDB = false): Promise<Bill[]> {
    // Get existing bills from DB
    const tbl = await this.table();
    const existingBills = await tbl.getBills(bills.map(m => m.id));
    // Merge fields from updated over existing ones
    bills = bills.map(ub => ({ ...existingBills.find(eb => eb.id === ub.id), ...ub }));
    // Fetch some extra fields individually
    bills = await Promise.all(bills.map(bill =>
      // Add some fields
      this.syncBill(bill, fields, true)
    ));
    return bills;
  }

}
