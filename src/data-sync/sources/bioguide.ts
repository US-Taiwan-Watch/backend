import { RequestHelper, RequestSource } from "./request-helper";

export abstract class BioguideHelper {
  public static async get(url: string): Promise<any[]> {
    const result = await RequestHelper.from(RequestSource.BIO_GUIDE).get(url);
    return JSON.parse(result);
  }

  public static async getMember(id: string): Promise<any[]> {
    const url = `https://bioguide.congress.gov/search/bio/${id}.json`;
    const result = await RequestHelper.from(RequestSource.BIO_GUIDE).get(url);
    return JSON.parse(result);
  }
}
