import request from "request";
import { Bill, TextVersionCode } from "../../../common/models";
import { parseStringPromise } from 'xml2js';

interface BillVersion {
  dateIssued: string;
  billVersion: TextVersionCode,
  billVersionLabel: string,
  packageLink: string,
  packageId: string,
  lastModified: string,
}

export class GovInfoHelper {
  private static getBillId(bill: Bill): string {
    return `${bill.congress}${bill.billType}${bill.billNumber}`;
  }

  public static async getBillVersions(bill: Bill): Promise<BillVersion[]> {
    const url = `https://api.govinfo.gov/related/BILLSTATUS-${this.getBillId(bill)}/BILLS`;
    const res = await this.get(url);
    return res.results as BillVersion[];
  }

  public static async getBillStatus(bill: Bill): Promise<any> {
    const url = `https://www.govinfo.gov/bulkdata/BILLSTATUS/116/${bill.billType}/BILLSTATUS-${this.getBillId(bill)}.xml`;
    return this.getXML(url);
  }

  public static get(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      request.get(url, {
        qs: {
          api_key: process.env.GOVINFO_API_KEY
        }
      }, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  public static getXML(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      request.get(url, {
        qs: {
          api_key: process.env.GOVINFO_API_KEY
        }
      }, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          reject(err);
          return;
        }
        parseStringPromise(body).then(result => {
          resolve(result);
        }).catch(xmlErr => {
          reject(xmlErr);
        });
      });
    });
  }


}