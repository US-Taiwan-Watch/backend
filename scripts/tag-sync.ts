import "reflect-metadata";
import {
  TableName,
  NotionSyncResolver,
} from "../src/resolver/notion-sync.resolver";

/**
 * yarn ts-node ./scripts/tag-sync.ts
 *
 */

if (require.main === module) {
  new NotionSyncResolver()
    // .createEditableMirrorInNotion(
    //   TableName.TAGS,
    //   "8de2c33f0d9946fa936e32ed7fc543e2",
    // )
    .syncFromNotion(TableName.TAGS)
    .then(() => console.log("done"));
}
