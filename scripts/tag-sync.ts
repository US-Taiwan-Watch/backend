import "reflect-metadata";
import {
  NotionDatabase,
  NotionSyncResolver,
} from "../src/resolver/notion-sync.resolver";

/**
 * yarn ts-node ./scripts/tag-sync.ts
 *
 */

if (require.main === module) {
  new NotionSyncResolver()
    // .linkDatabase(
    //   NotionDatabase.ARTICLES,
    //   "258a769d-05cd-4f5f-b95a-e37286eb3f63",
    // )
    // .createEditableMirrorInNotion(
    //   NotionDatabase.TAGS,
    //   "8de2c33f0d9946fa936e32ed7fc543e2",
    // )
    .syncWithNotion(NotionDatabase.ARTICLES, -1)
    .then(() => console.log("done"));
}
