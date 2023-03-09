import { Bill } from "../../../common/models";
import { RequestHelper, RequestSource } from "./request-helper";
import cheerio from "cheerio";

function nth(n: number) {
  return ["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] || "th";
}

export abstract class CongressGovHelper {
  public static async getBill(bill: Bill): Promise<cheerio.Root> {
    const url = `https://www.congress.gov/bill/${bill.congress}${nth(
      bill.congress,
    )}-congress/${bill.billType.startsWith("s") ? "senate" : "house"}-bill/${
      bill.billNumber
    }`;
    const res = await this.get(url);
    return cheerio.load(res);
  }

  public static async get(url: string): Promise<any> {
    const result = await RequestHelper.from(RequestSource.CONGRESS_GOV).get(
      url,
    );
    return result;
  }

  private static getBillId(bill: Bill): string {
    return `${bill.congress}/${bill.billType}/${bill.billNumber}`;
  }

  public static async getBillBasicInfo(bill: Bill): Promise<any> {
    const url = `https://api.congress.gov/v3/bill/${this.getBillId(bill)}`;
    return await this.getJSON(url);
  }

  public static async getJSON(url: string): Promise<any> {
    const result = await RequestHelper.from(RequestSource.CONGRESS_GOV).get(
      url,
      {
        qs: {
          api_key: process.env.CONGRESS_GOV_API_KEY,
          format: "json",
        },
      },
    );
    const json = JSON.parse(result);
    return json;
  }
}
