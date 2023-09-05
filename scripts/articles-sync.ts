import "reflect-metadata";
import { NotionSyncResolver } from "../src/resolver/notion-sync.resolver";
import { Logger } from "mongodb";
import { ArticleResolver } from "../src/resolver/article.resolver";

/**
 * yarn ts-node ./scripts/articles-sync.ts
 *
 */

if (require.main === module) {
  const logger = new Logger("articles-sync");
  logger.info("Start syncing articles");
  new NotionSyncResolver(ArticleResolver)
    .syncFromNotion(-1)
    .then(() => logger.info("Finish syncing articles"));
}
