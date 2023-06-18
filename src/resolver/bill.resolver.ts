import {
  Resolver,
  Query,
  Arg,
  Args,
  Root,
  FieldResolver,
  Mutation,
  Authorized,
  Int,
  Info,
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
import { BillSyncer, getBillSyncingCacheKey } from "../data-sync/bill.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { RedisClient } from "../redis/redis-client";
import { BillVersionDownloader } from "../storage/bill-version-downloader";
import { CongressUtils } from "../../common/utils/congress-utils";
import { Logger } from "../util/logger";
import { PaginatedBills, PaginationArgs } from "../util/pagination";
import { BillTable } from "./bill-table";
import { MemberResolver } from "./member.resolver";
import { GraphQLResolveInfo } from "graphql";
import { SyncToNotion } from "../data-sync/notion-manager";
import { UpdateResult } from "mongodb";

@Resolver(Bill)
export class BillResolver
  extends TableProvider(BillTable)
  implements SyncToNotion<Bill>
{
  logger: Logger;

  constructor() {
    super();
    this.logger = new Logger("BillResolver");
  }
  async getAllLocalItems(): Promise<Bill[]> {
    const tbl = await this.table();
    return await tbl.getAllBills();
  }

  getPropertiesForDatabaseCreation() {
    return {
      Id: {
        title: {},
      },
      Title: {
        rich_text: {},
      },
      "Title (zh)": {
        rich_text: {},
      },
      "Summary (zh)": {
        rich_text: {},
      },
      Congress: {
        number: {
          format: "number",
        },
      },
      "Bill Type": {
        rich_text: {},
      },
      "Bill number": {
        number: {
          format: "number",
        },
      },
    };
  }

  async getPropertiesForItemCreation(bill: Bill): Promise<any> {
    return {
      Id: {
        title: [
          {
            text: {
              content: bill.id,
            },
          },
        ],
      },
      Title: {
        rich_text: [
          {
            text: {
              content: bill.title?.en || "",
            },
          },
        ],
      },
      "Title (zh)": {
        rich_text: [
          {
            text: {
              content: bill.title?.zh || "",
            },
          },
        ],
      },
      "Summary (zh)": {
        rich_text: [
          {
            text: {
              content: bill.summary?.zh || "",
            },
          },
        ],
      },
      Congress: {
        number: bill.congress,
      },
      "Bill Type": {
        rich_text: [
          {
            text: {
              content: bill.billType,
            },
          },
        ],
      },
      "Bill number": {
        number: bill.billNumber,
      },
    };
  }

  async linkLocalItem(bill: Bill, notionPageId: string): Promise<UpdateResult> {
    const tbl = await this.table();
    return await tbl.updateBill(bill.id, { notionPageId });
  }

  getPropertiesForItemUpdating(entity: Bill): Promise<any> {
    throw new Error("Method not implemented.");
  }

  // TODO: false for debugging. Should be true while in real use
  private static shouldSave() {
    return true;
  }

  @FieldResolver(() => Member, { nullable: true })
  async sponsor(@Root() bill: Bill, @Info() info: GraphQLResolveInfo) {
    if (!bill.sponsorId) {
      return null;
    }
    info.variableValues.snapshotDate = bill.introducedDate;
    return await new MemberResolver().member(bill.sponsorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  cosponsorsCount(@Root() bill: Bill): number | undefined {
    return bill.cosponsorInfos?.length;
  }

  @FieldResolver(() => [Member])
  async cosponsors(
    @Root() bill: Bill,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Member[]> {
    if (!bill.cosponsorInfos) {
      return [];
    }
    info.variableValues.snapshotDate = bill.introducedDate;
    const cosponsors = await new MemberResolver().members(
      { offset: 0, limit: 300 },
      { bioGuideIds: bill.cosponsorInfos.map(ci => ci.memberId) },
    );
    return bill.cosponsorInfos.map(co => {
      const found = cosponsors.items().find(coo => coo.id === co.memberId);
      return found ? found : { id: co.memberId };
    });
  }

  @FieldResolver(() => Boolean)
  async isSyncing(@Root() bill: Bill): Promise<boolean> {
    const cacheKey = getBillSyncingCacheKey(bill.id);
    const isSyncing = await RedisClient.get(cacheKey);
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

    return new PaginatedBills(pageInfo, bills, false);
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

  // protected getPropertiesForCreation(bill: Bill) {
  //   if (!bill.id) {
  //     return null;
  //   }
  //   return {
  //     "Congress-type-number": {
  //       title: [
  //         {
  //           text: {
  //             content: bill.id,
  //           },
  //         },
  //       ],
  //     },
  //     "Introduce Date": {
  //       type: "rich_text",
  //       rich_text: [
  //         {
  //           text: {
  //             content: bill.introducedDate || "",
  //           },
  //         },
  //       ],
  //     },
  //     Congress: {
  //       select: {
  //         name: bill.congress.toString(),
  //       },
  //     },
  //     "Bill type": {
  //       select: {
  //         name: bill.billType,
  //       },
  //     },
  //     "Bill number": {
  //       number: bill.billNumber,
  //     },
  //     "Title (En)": {
  //       rich_text: [
  //         {
  //           text: {
  //             content: bill.title?.en || "",
  //           },
  //         },
  //       ],
  //     },
  //     "Summary (En)": {
  //       rich_text: [
  //         {
  //           text: {
  //             content: bill.summary?.en || "",
  //           },
  //         },
  //       ],
  //     },
  //     標題: {
  //       type: "rich_text",
  //       rich_text: [
  //         {
  //           text: {
  //             content: bill.title?.zh || "",
  //           },
  //         },
  //       ],
  //     },
  //     總結: {
  //       type: "rich_text",
  //       rich_text: [
  //         {
  //           text: {
  //             content: bill.summary?.zh || "",
  //           },
  //         },
  //       ],
  //     },
  //     "Last synced time": {
  //       date: {
  //         start: bill.lastSynced
  //           ? new Date(bill.lastSynced).toISOString()
  //           : null,
  //       },
  //     },
  //     // TODO
  //     // Tags: {
  //     //   relation: [
  //     //     {
  //     //       id: "66907eb9-3a19-4cc9-b8b2-d9a67228ae53",
  //     //     },
  //     //   ],
  //     // },
  //     "Sync status": {
  //       status: {
  //         name: bill.status,
  //       },
  //     },
  //     // URL: {
  //     //   url: 'https://???',
  //     // },
  //   };
  // }
}
