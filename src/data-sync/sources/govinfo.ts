import { Bill, TextVersionCode } from "../../../common/models";
import { parseStringPromise } from 'xml2js';
import { RequestHelper, RequestSource } from "./request-helper";

interface BillVersion {
  dateIssued: string;
  billVersion: TextVersionCode,
  billVersionLabel: string,
  packageLink: string,
  packageId: string,
  lastModified: string,
}

export abstract class GovInfoHelper {
  private static getBillId(bill: Bill): string {
    return `${bill.congress}${bill.billType}${bill.billNumber}`;
  }

  public static async getBillVersions(bill: Bill): Promise<BillVersion[]> {
    const url = `https://api.govinfo.gov/related/BILLSTATUS-${this.getBillId(bill)}/BILLS`;
    const res = await this.get(url);
    return res.results as BillVersion[];
  }

  public static async getBillStatus(bill: Bill): Promise<any> {
    const url = `https://www.govinfo.gov/bulkdata/BILLSTATUS/${bill.congress}/${bill.billType}/BILLSTATUS-${this.getBillId(bill)}.xml`;
    return this.getXML(url);
  }

  public static async get(url: string): Promise<any> {
    const result = await RequestHelper.from(RequestSource.GOV_INFO).get(url, {
      qs: {
        api_key: process.env.GOVINFO_API_KEY
      }
    })
    return JSON.parse(result);
  }

  public static async getXML(url: string): Promise<any> {
    const result = await RequestHelper.from(RequestSource.GOV_INFO).get(url, {
      qs: {
        api_key: process.env.GOVINFO_API_KEY
      }
    })
    try {
      const xml = await parseStringPromise(result);
      return xml;
    } catch (err) {
      throw err;
    }
  }

}