import { Client } from "@notionhq/client";
import { ClientSession } from "mongodb";
import { NotionPage } from "../../common/models";
import { NotionHelper } from "./editor-sync/notion-helper";

export abstract class NotionSyncer<T extends NotionPage> {
  protected abstract readonly databaseId: string;
  private notionClient: Client;

  constructor() {
    this.notionClient = NotionHelper.getClient();
  }

  protected getPropertiesForCreation(_entity: T): any {
    return null;
  }
  protected getPropertiesForUpdating(_entity: T): any {
    return null;
  }

  public queryAll() {
    this.notionClient.databases.query({ database_id: this.databaseId });
  }

  public async create(entity: T): Promise<string | null> {
    const properties = this.getPropertiesForCreation(entity);
    if (!properties) {
      return null;
    }
    const res = await this.notionClient.pages.create({
      parent: { database_id: this.databaseId },
      properties,
    });
    return res.id;
  }

  public update(entity: T) {
    const properties = this.getPropertiesForUpdating(entity);
    if (!properties) {
      return null;
    }
    if (!entity.notionPageId) {
      return;
    }
    this.notionClient.pages.update({
      page_id: entity.notionPageId,
      properties,
    });
  }
}
