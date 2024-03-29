import "reflect-metadata";
import { NotionSyncResolver } from "../src/resolver/notion-sync.resolver";
import { TagResolver } from "../src/resolver/tag.resolver";

/**
 * yarn ts-node ./scripts/tag-sync.ts
 *
 */

if (require.main === module) {
  new NotionSyncResolver(TagResolver)
    // .createEditableMirrorInNotion("8de2c33f0d9946fa936e32ed7fc543e2")
    .syncFromNotion()
    .then(() => console.log("done"));
}
