import "reflect-metadata";
import { NotionSyncResolver } from "../src/resolver/notion-sync.resolver";
import { BillResolver } from "../src/resolver/bill.resolver";

/**
 * yarn ts-node ./scripts/bill-notion-sync.ts
 *
 */

if (require.main === module) {
  new NotionSyncResolver(BillResolver)
    // .createEditableMirrorInNotion("8de2c33f0d9946fa936e32ed7fc543e2")
    // .insertAllToNotion()
    // .syncFromNotion()
    // .syncToNotion()
    .syncAll()
    .then(() => console.log("done"));
}
