import { RequestHelper, RequestSource } from "./request-helper";

let CACHE_TIME = 1000 * 3600 * 24;   // 1 day

export abstract class UnitedStatesHelper {
  static lastUpdateTime = 0;
  static cachedAllMemberData = [];

  public static async get(url: string): Promise<any[]> {
    const result = await RequestHelper.from(RequestSource.UNITEDSTATES).get(url);
    return JSON.parse(result);
  }

  public static async getAllMemberData(): Promise<any[]> {
    // TODO: handle concurrent query

    // no cached data or cached data is out of date
    if (this.lastUpdateTime == 0 || Date.now() - this.lastUpdateTime > CACHE_TIME) {
      console.log("get all data from the united states!")
      console.log(`last update time: ${this.lastUpdateTime}`);

      const result = await RequestHelper.from(RequestSource.UNITEDSTATES).get(
        "https://theunitedstates.io/congress-legislators/legislators-historical.json"
      );

      this.lastUpdateTime = Date.now();
      this.cachedAllMemberData = JSON.parse(result);

      console.log(`updated last update time: ${this.lastUpdateTime}`);
    } else {
      //console.log("skip getting data from the united states");
    }

    return this.cachedAllMemberData;
  }
}