import { Bill, TextVersionCode } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { CongressGovHelper } from "./sources/congress-gov";
import { GovInfoHelper } from "./sources/govinfo";
import { ProPublicaHelper } from "./sources/propublica";


export class BillSyncer extends EntitySyncer<Bill> {
  protected async syncImpl() {
    await Promise.allSettled([
      new BillGovInfoSyncer(this.entity, this.fields).sync(),
      new BillProPublicaSyncer(this.entity, this.fields).sync(),
      new BillCongressGovSyncer(this.entity, this.fields).sync(),
    ]);
    console.log(this.entity);
  }
}

class BillGovInfoSyncer extends EntitySyncer<Bill> {
  protected async syncImpl() {
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
}

class BillProPublicaSyncer extends EntitySyncer<Bill> {
  protected async syncImpl() {
    await Promise.allSettled([
      this.syncCosponsors(),
      this.syncActions(),
    ]);
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
}

class BillCongressGovSyncer extends EntitySyncer<Bill> {
  protected async syncImpl() {
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
