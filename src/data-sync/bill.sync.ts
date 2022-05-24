import { Bill } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { CongressGovHelper } from "./sources/congress-gov";
import { GovInfoHelper } from "./sources/govinfo";
import { ProPublicaHelper } from "./sources/propublica";


export class BillSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    await Promise.allSettled([
      new BillGovInfoSyncer(this.entity, this.fields).sync(),
      new BillProPublicaSyncer(this.entity, this.fields).sync(),
      new BillCongressGovSyncer(this.entity, this.fields).sync(),
    ])
    console.log(this.entity);
    return this.entity;
  }
}

class BillGovInfoSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    // Just to test the API
    const versions = await GovInfoHelper.getBillVersions(this.entity);
    const pubLaw = await GovInfoHelper.getBillPublicLaw(this.entity);
    this.entity.versions = [
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
      }))];
    return this.entity;
  }
}

class BillProPublicaSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    const res = await ProPublicaHelper.getCosponsors(this.entity);
    this.entity.sponsorId = res[0].sponsor_id;
    this.entity.cosponsorInfos = res[0].cosponsors.map((co: any) => ({
      memberId: co.cosponsor_id,
      date: co.date,
    }))
    return this.entity;
  }
}

class BillCongressGovSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    const $ = await CongressGovHelper.getBill(this.entity);
    let progress = $('ol.bill_progress > li').toArray();
    if (progress.length === 0) {
      return this.entity;
    }
    this.entity.trackers = progress.map((p: any) => ({
      stepName: $(p).contents().first().text(),
      selected: $(p).hasClass('selected')
    }));
    return this.entity;
  }
}
