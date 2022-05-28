import { Resolver, Query, Arg } from "type-graphql";
import { Bill, BillType } from "../../common/models";
import { BillSyncer } from "../data-sync/bill.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { BillVersionDownloader } from "../storage/bill-version-downloader";
import { CongressUtils } from "../util/congress-utils";
import { Logger } from "../util/logger";
import { BillTable } from "./bill-table";

@Resolver(Bill)
export class BillResolver extends TableProvider(BillTable) {
  logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('BillResolver')
  }
  // TODO: false for debugging. Should be true while in real use
  private static shouldSave() {
    return true;
  }

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

  public async syncNewBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    let bills = await tbl.getBillsThatNeedSync();
    return await this.syncBills(bills, false, fields);
  }

  public async syncOngoingBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    return this.syncBillsForCongress(CongressUtils.getCurrentCongress());
  }

  public async syncBillsForCongress(congress: number, fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    let bills = await tbl.getBillsByCongress(congress);
    return await this.syncBills(bills, false, fields);
  }

  // For one-time use
  public async syncAllBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    let bills = await tbl.getAllBills();
    return await this.syncBills(bills, false, fields);
  }

  public async syncBillWithId(
    id: string,
    fields?: (keyof Bill)[]
  ): Promise<Bill | null> {
    return this.syncBill(Bill.fromId(id), true, fields);
  }

  private async syncBill(bill: Bill, compareExisting: boolean, fields?: (keyof Bill)[]): Promise<Bill> {
    if (compareExisting) {
      bill = await this.bill(bill.id) || bill;
    }
    try {
      const suc = await new BillSyncer(bill, fields).sync();
      bill.needsSync = !suc || (
        bill.congress === CongressUtils.getCurrentCongress() &&
        bill.trackers?.find(t => t.stepName === 'Became Law' && t.selected) === undefined
      );
      if (BillResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceBill(bill);
      }
      await this.downloadBillVersions(bill, false);
      if (BillResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceBill(bill);
      }
    } catch (e) {
      console.log(`Failed to save bill ${bill.id}: ${e}`);
    }
    if (!BillResolver.shouldSave()) {
      console.dir(bill);
    }
    return bill;
  }

  private async syncBills(bills: Bill[], compareExisting: boolean, fields?: (keyof Bill)[]): Promise<Bill[]> {
    this.logger.log(`Syncing ${bills.length} bills: ${bills.map(b => b.id).join(', ')}`);
    if (compareExisting) {
      // Get existing bills from DB
      const tbl = await this.table();
      const existingBills = await tbl.getBills(bills.map(m => m.id));
      // Merge fields from updated over existing ones
      bills = bills.map(ub => ({ ...existingBills.find(eb => eb.id === ub.id), ...ub }));
    }
    // Fetch extra fields individually
    bills = await Promise.all(bills.map(bill =>
      // Add some fields
      this.syncBill(bill, false, fields)
    ));
    return bills;
  }

  public async downloadBillVersions(bill: Bill, compareExisting: boolean) {
    if (compareExisting) {
      bill = await this.bill(bill.id) || bill;
    }
    const contentTypes = BillVersionDownloader.getContentTypes();
    const all = bill.versions?.filter(v =>
      !v.downloaded || v.downloaded.length < contentTypes.length
    ).map(v =>
      contentTypes.filter(t => !v.downloaded || !v.downloaded.includes(t)).map(type =>
        new BillVersionDownloader({
          billId: bill.id,
          versionCode: v.code,
          contentType: type,
          publ: v.id,
        }).downloadAndUpload().then(suc => {
          if (!suc) {
            return;
          }
          if (!v.downloaded) {
            v.downloaded = [];
          }
          v.downloaded = [...v.downloaded, type];
        })
      )
    ).flat();
    await Promise.allSettled(all || []);
  }

}
