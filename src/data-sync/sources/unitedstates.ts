import { RequestHelper, RequestSource } from "./request-helper";

const CACHE_TIME = 1000 * 3600 * 24;   // 1 day

export abstract class UnitedStatesHelper {
  static lastUpdateTime = 0;
  static cachedAllMemberData = [];

  public static async get(url: string): Promise<any[]> {
    const result = await RequestHelper.from(RequestSource.UNITEDSTATES).get(url);
    return JSON.parse(result);
  }

  public static async getAllMemberData(): Promise<any[]> {

    // no cached data or cached data is out of date
    if (this.lastUpdateTime === 0 || Date.now() - this.lastUpdateTime > CACHE_TIME) {
      let currentTime = 0;

      // Fetch Current Members
      console.log("get current member data from the united states source")
      console.log(`last update time: ${this.lastUpdateTime}`);

      const result_currMember = await RequestHelper.from(RequestSource.UNITEDSTATES).get(
        "https://theunitedstates.io/congress-legislators/legislators-current.json"
      );

      currentTime = Date.now();
      this.cachedAllMemberData = JSON.parse(result_currMember);

      console.log(`updated last update time: ${currentTime}`);

      // Fetch Historical Members
      console.log("get historical member data from the united states source")
      console.log(`last update time: ${this.lastUpdateTime}`);

      const result_histMember = await RequestHelper.from(RequestSource.UNITEDSTATES).get(
        "https://theunitedstates.io/congress-legislators/legislators-historical.json"
      );

      currentTime = Date.now();
      this.cachedAllMemberData = this.cachedAllMemberData.concat(JSON.parse(result_histMember))

      console.log(`updated last update time: ${currentTime}`);

      this.lastUpdateTime = currentTime;
    }

    return this.cachedAllMemberData;
  }
}