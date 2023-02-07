import e from "express";
import {
  Resolver,
  Query,
  Arg,
  Args,
  Root,
  FieldResolver,
  Mutation,
  Ctx,
  Authorized,
} from "type-graphql";
import {
  Auth0RoleName,
  Bill,
  BillInput,
  BillQueryInput,
  BillSyncStatus,
  BILL_AUTHORIZED_ROLES,
  I18NText,
  Member,
} from "../../common/models";
import { IApolloContext } from "../@types/common.interface";
import { BillSyncer, getBillSyncingCacheKey } from "../data-sync/bill.sync";
import { NotionBillSyncer } from "../data-sync/notion.bill.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { RedisClient } from "../redis/redis-client";
import { BillVersionDownloader } from "../storage/bill-version-downloader";
import { CongressUtils } from "../util/congress-utils";
import { Logger } from "../util/logger";
import { PaginatedBills, PaginationArgs } from "../util/pagination";
import { BillTable } from "./bill-table";
import { MemberResolver } from "./member.resolver";

@Resolver(Bill)
export class BillResolver extends TableProvider(BillTable) {
  logger: Logger;

  constructor() {
    super();
    this.logger = new Logger("BillResolver");
  }
  // TODO: false for debugging. Should be true while in real use
  private static shouldSave() {
    return true;
  }

  @FieldResolver()
  async sponsor(@Root() bill: Bill) {
    if (!bill.sponsorId) {
      return null;
    }
    return await new MemberResolver().member(bill.sponsorId);
  }

  @FieldResolver()
  cosponsorsCount(@Root() bill: Bill): number | undefined {
    return bill.cosponsorInfos?.length;
  }

  @FieldResolver()
  async cosponsors(@Root() bill: Bill): Promise<Member[] | null> {
    if (!bill.cosponsorInfos) {
      return null;
    }
    const cosponsors = await new MemberResolver().members(
      bill.cosponsorInfos.map(ci => ci.memberId),
    );
    return bill.cosponsorInfos.map(co => {
      const found = cosponsors.find(coo => coo.id === co.memberId);
      return found ? found : { id: co.memberId };
    });
  }

  @FieldResolver()
  async isSyncing(@Root() bill: Bill): Promise<boolean> {
    const cacheKey = getBillSyncingCacheKey(bill.id);
    const isSyncing = await RedisClient.get(cacheKey);
    console.log(isSyncing);
    return !!isSyncing;
  }

  @Query(() => PaginatedBills, { nullable: false })
  public async bills(
    @Args() pageInfo: PaginationArgs,
    @Arg("query", { nullable: true }) queryInput?: BillQueryInput,
  ): Promise<PaginatedBills> {
    const tbl = await this.table();
    let bills: Bill[];

    if (queryInput && queryInput.keywords.length > 0) {
      bills = await tbl.searchBills(queryInput.keywords);
    } else {
      bills = await tbl.getAllBills();
    }

    return new PaginatedBills(bills, pageInfo);
  }

  @Query(() => Bill, { nullable: true })
  public async bill(@Arg("id") id: string): Promise<Bill | null> {
    const tbl = await this.table();
    const bill = await tbl.getBill(id);
    return bill;
  }

  @Authorized<Auth0RoleName>(BILL_AUTHORIZED_ROLES)
  @Mutation(() => Bill, { nullable: true })
  public async addBill(
    @Ctx() ctx: IApolloContext,
    @Arg("bill") billInput: BillInput,
  ): Promise<Bill | null> {
    const tbl = await this.table();
    const bill = Bill.fromKeys(
      billInput.congress,
      billInput.billType,
      billInput.billNumber,
    );
    const existingBill = await this.bill(bill.id);
    if (existingBill) {
      throw Error(`Bill ${bill.id} exists`);
    }
    bill.createdTime = Date.now().valueOf();
    bill.title = <I18NText>billInput.title;
    bill.summary = <I18NText>billInput.summary;
    await tbl.createOrReplaceBill(bill);
    return this.bill(bill.id);
  }

  @Authorized<Auth0RoleName>(BILL_AUTHORIZED_ROLES)
  @Mutation(() => Boolean)
  public async deleteBill(@Arg("id") id: string) {
    const tbl = await this.table();
    const result = await tbl.updateBill(id, { deleted: true });
    return result.modifiedCount > 0;
  }

  @Authorized<Auth0RoleName>(BILL_AUTHORIZED_ROLES)
  @Mutation(() => Bill, { nullable: true })
  public async updateBill(
    @Ctx() ctx: IApolloContext,
    @Arg("bill") billInput: BillInput,
  ): Promise<Bill | null> {
    const tbl = await this.table();
    const bill = Bill.fromKeys(
      billInput.congress,
      billInput.billType,
      billInput.billNumber,
    );
    bill.title = <I18NText>billInput.title;
    bill.summary = <I18NText>billInput.summary;
    await tbl.createOrReplaceBill(bill);
    return this.bill(bill.id);
  }

  public async downloadAllBillVersions(): Promise<Bill[]> {
    const tbl = await this.table();
    const bills = await tbl.getBillsThatNeedDownload();
    await Promise.allSettled(
      bills.map(b => this.downloadBillVersions(b, false)),
    );
    return bills;
  }

  public async syncNewBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    const bills = await tbl.getBillsThatNeedSync();
    return await this.syncBills(bills, false, fields);
  }

  public async syncOngoingBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    return this.syncBillsForCongress(CongressUtils.getCurrentCongress());
  }

  public async syncBillsToNotion() {
    const tbl = await this.table();
    const bills = await tbl.getBillsThatNeedSync();
    const res = await new NotionBillSyncer().create(bills[0]);
    console.log(res);
  }

  public async syncBillsForCongress(
    congress: number,
    fields?: (keyof Bill)[],
  ): Promise<Bill[]> {
    const tbl = await this.table();
    const bills = await tbl.getBillsByCongress(congress);
    return await this.syncBills(bills, false, fields);
  }

  // For one-time use
  public async syncAllBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
    const tbl = await this.table();
    const bills = await tbl.getAllBills();
    return await this.syncBills(bills, false, fields);
  }

  @Authorized<Auth0RoleName>(BILL_AUTHORIZED_ROLES)
  @Mutation(() => Bill, { name: "syncBill", nullable: true })
  public async syncBillWithId(
    @Arg("billId") id: string,
    fields?: (keyof Bill)[],
  ): Promise<Bill | null> {
    return this.syncBill(Bill.fromId(id), true, fields);
  }

  private async syncBill(
    bill: Bill,
    compareExisting: boolean,
    fields?: (keyof Bill)[],
  ): Promise<Bill> {
    if (compareExisting) {
      bill = (await this.bill(bill.id)) || bill;
    }
    try {
      const suc = await new BillSyncer(bill, fields).sync();
      if (!suc) {
        bill.status = BillSyncStatus.FAILED;
      } else if (
        bill.congress === CongressUtils.getCurrentCongress() &&
        bill.trackers?.find(t => t.stepName === "Became Law" && t.selected) ===
          undefined
      ) {
        bill.status = BillSyncStatus.WILL_SYNC;
      } else {
        bill.status = BillSyncStatus.DONE;
      }
      if (BillResolver.shouldSave()) {
        const tbl = await this.table();
        await tbl.createOrReplaceBill(bill);
      }
      await this.downloadBillVersions(bill, false);
    } catch (e) {
      console.log(`Failed to save bill ${bill.id}: ${e}`);
    }
    if (!BillResolver.shouldSave()) {
      console.dir(bill);
    }
    return bill;
  }

  private async syncBills(
    bills: Bill[],
    compareExisting: boolean,
    fields?: (keyof Bill)[],
  ): Promise<Bill[]> {
    this.logger.log(
      `Syncing ${bills.length} bills: ${bills.map(b => b.id).join(", ")}`,
    );
    if (compareExisting) {
      // Get existing bills from DB
      const tbl = await this.table();
      const existingBills = await tbl.getBills(bills.map(m => m.id));
      // Merge fields from updated over existing ones
      bills = bills.map(ub => ({
        ...existingBills.find(eb => eb.id === ub.id),
        ...ub,
      }));
    }
    // Fetch extra fields individually
    bills = await Promise.all(
      bills.map(bill =>
        // Add some fields
        this.syncBill(bill, false, fields),
      ),
    );
    return bills;
  }

  public async downloadBillVersions(bill: Bill, compareExisting: boolean) {
    if (compareExisting) {
      bill = (await this.bill(bill.id)) || bill;
    }
    const contentTypes = BillVersionDownloader.getContentTypes();
    const all = bill.versions
      ?.map(v =>
        contentTypes
          .filter(t => !v.downloaded || !(t in v.downloaded))
          .map(type =>
            new BillVersionDownloader({
              billId: bill.id,
              versionCode: v.code,
              contentType: type,
              publ: v.id,
            })
              .downloadAndUpload()
              .then(suc => {
                if (!suc) {
                  return;
                }
                v.downloaded = { ...v.downloaded, [type]: true };
              }),
          ),
      )
      .flat();
    await Promise.allSettled(all || []);
    const tbl = await this.table();
    await tbl.createOrReplaceBill(bill);
  }
}
