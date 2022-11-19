import { Bill, I18NText } from "../../common/models";
import { RedisClient } from "../redis/redis-client";
import { Logger } from "../util/logger";
import { EntitySyncer } from "./entity.sync";
import { CongressGovHelper } from "./sources/congress-gov";
import { GovInfoHelper } from "./sources/govinfo";
import { ProPublicaHelper } from "./sources/propublica";

const logger = new Logger("BillSyncer");

enum BillSyncStep {
  // GovInfo
  VERSIONS = "versions",
  // Propublica
  COSPONSORS = "cosponsors",
  ACTIONS = "actions",
  // CongressGov
  TRACKERS = "trackers",
  TITLE = "title",
}

export const getBillSyncingCacheKey = (billId: string, step?: string) =>
  step ? `sync-${billId}-${step}` : `sync-${billId}`;

export class BillSyncer extends EntitySyncer<Bill> {
  // TODO: sync basic info?
  protected static syncSteps = {
    [BillSyncStep.VERSIONS]: "Versions",
    [BillSyncStep.COSPONSORS]: "Sponsor and Cosponsors",
    [BillSyncStep.ACTIONS]: "Actions",
    [BillSyncStep.TRACKERS]: "Trackers",
  };

  public async syncStep(step: BillSyncStep) {
    const cacheKey = getBillSyncingCacheKey(this.entity.id, step);
    let method: Promise<void>;
    switch (step) {
      case BillSyncStep.TITLE:
        method = this.syncBasicInfo();
        break;
      case BillSyncStep.VERSIONS:
        method = this.syncVersions();
        break;
      case BillSyncStep.TRACKERS:
        method = this.syncTrackers();
        break;
      case BillSyncStep.COSPONSORS:
        method = this.syncCosponsors();
        break;
      case BillSyncStep.ACTIONS:
        method = this.syncActions();
        break;
    }
    try {
      RedisClient.set(cacheKey, "syncing", RedisClient.CacheTime.HALF_HOUR);
      await method;
      this.entity.fieldsLastSynced = {
        ...this.entity.fieldsLastSynced,
        [step]: new Date().getTime(),
      };
    } finally {
      RedisClient.client.del(cacheKey);
    }
  }

  public async syncImpl() {
    let runningSteps = Object.values(BillSyncStep);
    if (Array.isArray(this.toUpdate) && this.toUpdate.length > 0) {
      runningSteps = this.toUpdate
        .map(field => field as BillSyncStep)
        .filter(f => runningSteps.includes(f));
    }

    const cacheKey = getBillSyncingCacheKey(this.entity.id);
    RedisClient.set(cacheKey, "syncing", RedisClient.CacheTime.HALF_HOUR);
    const results = await Promise.allSettled(
      runningSteps.map(field => this.syncStep(field)),
    );
    RedisClient.client.del(cacheKey);
    let succeed = true;
    const successSteps: string[] = [];
    results.forEach((res, i) => {
      if (res.status == "fulfilled") {
        successSteps.push(runningSteps[i]);
        return;
      }
      logger.log(
        `Failed to sync ${runningSteps[i]} for ${this.entity.id}: ${res.reason}`,
      );
      succeed = false;
    });
    if (successSteps.length > 0) {
      logger.log(
        `Synced ${successSteps.join(", ")} for ${this.entity.id} successfully`,
      );
    }
    if (succeed) {
      this.entity.lastSynced = new Date().getTime();
    }
    return succeed;
  }

  protected async syncBasicInfo() {
    const info = await CongressGovHelper.getBillBasicInfo(this.entity);
    this.entity.title = I18NText.create(info.bill.title, this.entity.title?.zh);
    this.entity.introducedDate = info.bill.introducedDate;
  }

  protected async syncVersions() {
    const [versions, pubLaw] = await Promise.all([
      GovInfoHelper.getBillVersions(this.entity),
      GovInfoHelper.getBillPublicLaw(this.entity),
    ]);
    const newVersions = [
      ...versions.map(v => ({
        code: v.billVersion,
        date: v.dateIssued,
        name: v.billVersionLabel,
      })),
      ...pubLaw.map(v => ({
        code: "pl",
        date: v.dateIssued,
        name: v.citation,
        id: v.packageId.split("-")[1],
      })),
    ];

    this.entity.versions = newVersions.map(nv => {
      const existing = this.entity.versions?.find(ev => nv.code == ev.code);
      if (existing) {
        return { ...existing, ...nv };
      }
      return nv;
    });
  }

  private async syncCosponsors() {
    const res = await ProPublicaHelper.getCosponsors(this.entity);
    this.entity.sponsorId = res[0].sponsor_id;
    this.entity.cosponsorInfos = res[0].cosponsors.map((co: any) => ({
      memberId: co.cosponsor_id,
      date: co.date,
    }));
  }

  private async syncActions() {
    const res = await ProPublicaHelper.getBill(this.entity);
    this.entity.actionsAll = res[0].actions.map((v: any) => ({
      description: v.description,
      date: v.datetime,
      chamber: v.chamber,
    }));
  }

  protected async syncTrackers() {
    const $ = await CongressGovHelper.getBill(this.entity);
    const progress = $("ol.bill_progress > li").toArray();
    console.log($);
    if (progress.length === 0) {
      return;
    }
    this.entity.trackers = progress.map((p: any) => ({
      stepName: $(p).contents().first().text(),
      selected: $(p).hasClass("selected"),
    }));
  }
}
