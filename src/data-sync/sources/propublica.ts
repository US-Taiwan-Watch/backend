import request from "request";
import { RequestHelper } from "./request-helper";

export abstract class ProPublicaHelper {
  public static async get<T>(url: string): Promise<any> {
    const result = await RequestHelper.get(url, {
      headers: {
        'x-api-key': process.env.PROPUBLICA_API_KEY
      }
    });
    return JSON.parse(result).results;
  }

}