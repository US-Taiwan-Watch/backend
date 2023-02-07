import { Client } from "@notionhq/client";

const API_KEY = "secret_O3Zio9LEyEciJ2kjEhBvRYmoMPn9CWqer87F9OTsP70";

export class NotionHelper {
  public static getClient() {
    return new Client({
      auth: API_KEY,
    });
  }
}
