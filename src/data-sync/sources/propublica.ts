import { Bill } from "../../../common/models";
import { RequestHelper, RequestSource } from "./request-helper";

export abstract class ProPublicaHelper {
  public static async getCosponsors(bill: Bill) {
    const url = `https://api.propublica.org/congress/v1/${bill.congress}/bills/${bill.billType}${bill.billNumber}/cosponsors.json`;
    return await this.get(url);
  }

  public static async getBill(bill: Bill) {
    const url = `https://api.propublica.org/congress/v1/${bill.congress}/bills/${bill.billType}${bill.billNumber}.json`;
    return await this.get(url);
  }

  public static async get(url: string): Promise<any[]> {
    const result = await RequestHelper.from(RequestSource.PROPUBLICA).get(url, {
      headers: {
        'x-api-key': process.env.PROPUBLICA_API_KEY
      }
    });

    const parsed_result = JSON.parse(result);

    if (parsed_result.status != "OK") {
      throw parsed_result;
    }

    return parsed_result.results;
  }

}