import "reflect-metadata";
import {
  TableName,
  NotionSyncResolver,
} from "../src/resolver/notion-sync.resolver";
import { Logger } from "mongodb";

/**
 * yarn ts-node ./scripts/articles-sync.ts
 *
 */

if (require.main === module) {
  const logger = new Logger("articles-sync");
  logger.info("Start syncing articles");
  new NotionSyncResolver()
    .syncFromNotion(TableName.ARTICLES)
    .then(() => logger.info("Finish syncing articles"));
}
