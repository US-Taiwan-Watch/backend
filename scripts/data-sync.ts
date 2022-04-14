import { Legislator } from "../common/models/legislator";
import { LegislatorSyncer } from "../src/data-sync/legislator.sync";


if (require.main === module) {
  let legislator = new Legislator('S000622');
  new LegislatorSyncer().sync(legislator, ['firstName']).then(l => {
    console.log(l);
  })
}

