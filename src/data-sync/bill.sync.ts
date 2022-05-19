import { intersection } from "lodash";
import { Bill } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { GovInfoHelper } from "./sources/govinfo";


export class BillSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    await new BillGovInfoSyncer(this.entity, this.fields).sync();
    await new BillProPublicaSyncer(this.entity, this.fields).sync();
    // Add other syncers here. Will run in sequential. TODO: update to parallel
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
        label: v.billVersionLabel
      })),
      ...pubLaw.map(v => ({
        code: 'pl',
        date: v.dateIssued,
        label: v.citation,
        id: v.packageId.split('-')[1],
      }))];
    return this.entity;
  }
}

class BillProPublicaSyncer extends EntitySyncer<Bill> {
  public async sync(): Promise<Bill> {
    // TODO: go sync with source
    return this.entity;
  }
}
