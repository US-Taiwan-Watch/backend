import { RequestHelper, RequestSource } from "./request-helper";

export abstract class UnitedStatesHelper {
  public static async get(url: string): Promise<any[]> {
    const result = await RequestHelper.from(RequestSource.UNITEDSTATES).get(url);
    return JSON.parse(result);
  }
}