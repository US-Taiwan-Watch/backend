import 'reflect-metadata';
import { LegislatorResolver } from "../src/resolver/legislator.resolver";


if (require.main === module) {
  new LegislatorResolver().syncLegislatorWithKey('S000622', ['firstName']).then(l => {
    console.log(l);
  })
}

