import { intersection } from "lodash";
import { Legislator } from "../../common/models/legislator";
import { EntitySyncer, } from "./entity.sync";
import { ProPublicaHelper } from "./sources/propublica";


export class LegislatorSyncer implements EntitySyncer<Legislator> {
  public async sync(legislator: Legislator, fields: string[]): Promise<Legislator> {
    await new LegislatorProPublicaSyncer().sync(legislator, fields);
    // Add other syncers here. Will run in sequential. TODO: update to parallel
    return legislator;
  }
}

class LegislatorProPublicaSyncer implements EntitySyncer<Legislator> {
  public async sync(legislator: Legislator, fields: string[]): Promise<Legislator> {
    if (fields.includes('firstName')) {
      const result = await ProPublicaHelper.get(`https://api.propublica.org/congress/v1/members/${legislator.bioGuideId}.json`);
      legislator.firstName = result[0]['first_name'];
    }
    return legislator;
  }
}
