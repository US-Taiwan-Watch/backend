import { Bill } from "../../common/models";
import { Logger } from "../util/logger";
import { EntitySyncer, } from "./entity.sync";
import { CongressGovHelper } from "./sources/congress-gov";
import { GovInfoHelper } from "./sources/govinfo";
import { ProPublicaHelper } from "./sources/propublica";

const logger = new Logger('BillSyncer');

export class BillSyncer extends EntitySyncer<Bill> {
  syncMethods = [
    // GovInfo
    this.syncVersions,
    // Propublica
    this.syncCosponsors,
    this.syncActions,
    // CongressGov
    this.syncTrackers,
  ];

  public async syncImpl() {
    const results = await Promise.allSettled(this.syncMethods.map(m => m.call(this)));
    let succeed = true;
    results.forEach((res, i) => {
      if (res.status == 'fulfilled') {
        return;
      }
      logger.log(`Failed in ${this.syncMethods[i].name} for ${this.entity.id}: ${res.reason}`);
      succeed = false;
    });
    return succeed;
  }

  protected async syncVersions() {
    const [versions, pubLaw] = await Promise.all([
      GovInfoHelper.getBillVersions(this.entity),
      GovInfoHelper.getBillPublicLaw(this.entity)
    ]);
    const newVersions = [
      ...versions.map(v => ({
        code: v.billVersion,
        date: v.dateIssued,
        name: v.billVersionLabel
      })),
      ...pubLaw.map(v => ({
        code: 'pl',
        date: v.dateIssued,
        name: v.citation,
        id: v.packageId.split('-')[1],
      }))
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
    let progress = $('ol.bill_progress > li').toArray();
    if (progress.length === 0) {
      return;
    }
    this.entity.trackers = progress.map((p: any) => ({
      stepName: $(p).contents().first().text(),
      selected: $(p).hasClass('selected')
    }));
  }
}
