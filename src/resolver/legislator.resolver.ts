import _ from "lodash";
import { Resolver, Query, Arg } from "type-graphql";
import { Legislator } from "../../common/models";
import { LegislatorSyncer } from "../data-sync/legislator.sync";
import { TableProvider } from "../mongodb/mongodb-manager";
import { LegislatorTable } from "./legislator-table";

@Resolver(Legislator)
export class LegislatorResolver extends TableProvider(LegislatorTable) {
  @Query(() => [Legislator], { nullable: false })
  public async legislators(): Promise<Legislator[]> {
    const tbl = await this.table();
    return await tbl.getAllLegislators();
  }

  @Query(() => Legislator, { nullable: true })
  public async legislator(@Arg("bioGuideId") bioGuideId: string): Promise<Legislator | null> {
    const tbl = await this.table();
    return await tbl.getLegislator(bioGuideId);
  }

  public async syncLegislator(legislator: Legislator, fields: (keyof Legislator)[]): Promise<Legislator> {
    return await new LegislatorSyncer().sync(legislator, fields);
  }

  public async syncLegislatorWithKey(bioGuideId: string, fields: (keyof Legislator)[]): Promise<Legislator | null> {
    let legislator = await this.legislator(bioGuideId);
    if (!legislator) {
      return null;
    }
    new LegislatorSyncer().sync(legislator, fields);
    // TODO: save update to DB
    return legislator;
  }

  // public async syncAllLegislator(fields: (keyof Legislator)[]) {
  //   let allLegislators = await this.getAllLegislators();
  //   allLegislators.forEach(async legislator =>
  //     await this.syncLegislator(legislator, fields)
  //   );
  // }

}
