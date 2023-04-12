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
    .createEditableMirrorInNotion(
      NotionDatabase.TAGS,
      "8de2c33f0d9946fa936e32ed7fc543e2",
    )
    // .syncWithNotion(NotionDatabase.TAGS)
    .then(() => console.log("done"));
}