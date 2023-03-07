import "reflect-metadata";
import { TagResolver } from "../src/resolver/tag.resolver";

/**
 * yarn ts-node ./scripts/tag-sync.ts
 *
 */

if (require.main === module) {
  new TagResolver()
    // .createEditableMirrorInNotion("8de2c33f0d9946fa936e32ed7fc543e2")
    .syncFromNotion()
    .then(() => console.log("done"));
}
