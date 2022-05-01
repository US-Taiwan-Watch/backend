import { intersection } from "lodash";
import { Bill } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { GovInfoHelper } from "./sources/govinfo";


export class BillSyncer implements EntitySyncer<Bill> {
  public async sync(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    await new BillGovInfoSyncer().sync(bill, fields);
    await new BillProPublicaSyncer().sync(bill, fields);
    // Add other syncers here. Will run in sequential. TODO: update to parallel
    return bill;
  }
}

class BillGovInfoSyncer implements EntitySyncer<Bill> {
  public async sync(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    // Just to test the API
    const result = await GovInfoHelper.getBillVersions(bill);
    console.log(result);
    return bill;
  }
}

class BillProPublicaSyncer implements EntitySyncer<Bill> {
  public async sync(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    // TODO: go sync with source
    return bill;
  }
}
