import { Bill } from "../../../common/models";
import { RequestHelper, RequestSource } from "./request-helper";
import cheerio from "cheerio";

export abstract class CongressGovHelper {
  public static async getBill(bill: Bill): Promise<cheerio.Root> {
    const url = `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.billType.startsWith('s') ? 'senate' : 'house'}-bill/${bill.billNumber}/`;
    const res = await this.get(url);
    return cheerio.load(res);
  }

  public static async get(url: string): Promise<any> {
    const result = await RequestHelper.from(RequestSource.CONGRESS_GOV).get(url)
    return result;
  }

}