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
  TextVersionWithFiles,
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
import { UpdateResult } from "mongodb";
import {
  CloneToNotion,
  SyncFromNotion,
  SyncToNotion,
} from "./notion-sync.resolver";

@Resolver(Bill)
export class BillResolver
  extends TableProvider(BillTable)
  implements CloneToNotion<Bill>, SyncToNotion<Bill>, SyncFromNotion
{
  logger: Logger;

  constructor() {
    super();
    this.logger = new Logger("BillResolver");
  }

  async createOrUpdateLocalItems(pageObjects: any[]): Promise<UpdateResult[]> {
    const tbl = await this.table();
    return (
      await Promise.all(
        pageObjects.map(pageObject => {
          const bill = Bill.fromId(
            pageObject.properties["Congress-type-number"].title[0].text.content,
          );
          if (!bill) {
            return null;
          }
          return tbl.upsertItemByCustomQuery<Bill>(
            { notionPageId: pageObject.id },
            {
              $set: {
                ...bill,
                title: {
                  zh:
                    pageObject.properties["標題"].rich_text[0]?.text?.content ||
                    "",
                },
                summary: {
                  zh:
                    pageObject.properties["概要"].rich_text[0]?.text?.content ||
                    "",
                },
                status:
                  pageObject.properties["Sync status"].select?.name ||
                  BillSyncStatus.NOT_STARTED,
                deleted: false,
              },
              $setOnInsert: {
                _id: bill.id,
                createdTime: new Date().getTime(),
              },
            },
          );
        }),
      )
    ).filter((a): a is UpdateResult => !!a);
  }

  async deleteNotFoundLocalItems(notionPageIds: string[]): Promise<number> {
    const tbl = await this.table();
    const updateResult = await tbl.updateItemsByCustomQuery<Bill>(
      { notionPageId: { $nin: notionPageIds } },
      {
        $set: {
          deleted: true,
        },
      },
    );
    return updateResult.modifiedCount;
  }

  async getAllLocalItems(): Promise<Bill[]> {
    const tbl = await this.table();
    const bills = await tbl.getAllBills();
    // return bills.slice(0, 10);
    return bills;
  }

  async getUpdatedLocalItems(lastUpdated: number): Promise<Bill[]> {
    const tbl = await this.table();
    return await tbl.queryItemsWorking({
      deleted: { $ne: true },
      $or: [
        { lastSynced: { $gt: lastUpdated } },
        { createdTime: { $gt: lastUpdated } },
      ],
    });
  }

  getPropertiesForDatabaseCreation() {
    return {
      "Congress-type-number": {
        title: {},
      },
      "Introduce Date": {
        rich_text: {},
      },
      Congress: {
        number: {
          format: "number",
        },
      },
      "Bill Type": {
        select: {},
      },
      "Bill Number": {
        number: {
          format: "number",
        },
      },
      "Title (En)": {
        rich_text: {},
      },
      標題: {
        rich_text: {},
      },
      概要: {
        rich_text: {},
      },
      "Last synced time": {
        date: {},
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
        select: {
          options: [
            {
              name: BillSyncStatus.WRONG_FORMAT,
              color: "red",
            },
            {
              name: BillSyncStatus.FAILED,
              color: "red",
            },
            {
              name: BillSyncStatus.NOT_STARTED,
              color: "default",
            },
            {
              name: BillSyncStatus.WILL_SYNC,
              color: "blue",
            },
            {
              name: BillSyncStatus.MANUAL_SYNC,
              color: "green",
            },
            {
              name: BillSyncStatus.DONE,
              color: "green",
            },
          ],
        },
      },
      // URL: {
      //   url: 'https://???',
      // },
    };
  }

  async getPropertiesForItemCreation(bill: Bill): Promise<any> {
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
        rich_text: [
          {
            text: {
              content: bill.introducedDate || "",
            },
          },
        ],
      },
      Congress: {
        number: bill.congress,
      },
      "Bill Type": {
        select: {
          name: bill.billType,
        },
      },
      "Bill Number": {
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
      標題: {
        rich_text: [
          {
            text: {
              content: bill.title?.zh || "",
            },
          },
        ],
      },
      概要: {
        rich_text: [
          {
            text: {
              content: bill.summary?.zh || "",
            },
          },
        ],
      },
      ...(bill.lastSynced
        ? {
            "Last synced time": {
              date: {
                start: new Date(bill.lastSynced).toISOString(),
              },
            },
          }
        : {}),
      // TODO
      // Tags: {
      //   relation: [
      //     {
      //       id: "66907eb9-3a19-4cc9-b8b2-d9a67228ae53",
      //     },
      //   ],
      // },
      "Sync status": {
        select: {
          name: bill.status,
        },
      },
      // URL: {
      //   url: 'https://???',
      // },
    };
  }

  async linkLocalItem(bill: Bill, notionPageId: string): Promise<UpdateResult> {
    const tbl = await this.table();
    return await tbl.updateBill(bill.id, { notionPageId });
  }

  async getPropertiesForItemUpdate(bill: Bill): Promise<any> {
    return {
      "Introduce Date": {
        rich_text: [
          {
            text: {
              content: bill.introducedDate || "",
            },
          },
        ],
      },
      Congress: {
        number: bill.congress,
      },
      "Bill Type": {
        select: {
          name: bill.billType,
        },
      },
      "Bill Number": {
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
      ...(bill.lastSynced && bill.lastSynced > 0
        ? {
            "Last synced time": {
              date: {
                start: new Date(bill.lastSynced).toISOString(),
              },
            },
          }
        : {}),
      // TODO
      // Tags: {
      //   relation: [
      //     {
      //       id: "66907eb9-3a19-4cc9-b8b2-d9a67228ae53",
      //     },
      //   ],
      // },
      "Sync status": {
        select: {
          name: bill.status,
        },
      },
      // URL: {
      //   url: 'https://???',
      // },
    };
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

  @FieldResolver(() => [TextVersionWithFiles])
  async versions(@Root() bill: Bill): Promise<TextVersionWithFiles[]> {
    return (
      bill.versions?.map(version => ({
        ...version,
        files: {
          pdf: new BillVersionDownloader({
            billId: bill.id,
            versionCode: version.code,
            contentType: "pdf",
          }).getPublicUrl(),
        },
      })) || []
    );
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
    if (!bill) {
      throw Error(
        `invalid input: ${billInput.congress}, ${billInput.billType}, ${billInput.billNumber}`,
      );
    }
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
    if (!bill) {
      throw Error(
        `invalid input: ${billInput.congress}, ${billInput.billType}, ${billInput.billNumber}`,
      );
    }
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

  public async syncIncompleteBills(fields?: (keyof Bill)[]): Promise<Bill[]> {
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
    const bill = Bill.fromId(id);
    if (!bill) {
      return null;
    }
    return this.syncBill(bill, true, fields);
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
