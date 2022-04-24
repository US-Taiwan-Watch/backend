import { intersection } from "lodash";
import { Bill } from "../../common/models";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";


export class BillSyncer implements EntitySyncer<Bill> {
  public async sync(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    await new BillProPublicaSyncer().sync(bill, fields);
    // Add other syncers here. Will run in sequential. TODO: update to parallel
    return bill;
  }
}

class BillProPublicaSyncer implements EntitySyncer<Bill> {
  public async sync(bill: Bill, fields: (keyof Bill)[]): Promise<Bill> {
    // TODO: go sync with source
    return bill;
  }
}
