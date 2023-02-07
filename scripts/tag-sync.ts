import "reflect-metadata";
import { BillResolver } from "../src/resolver/bill.resolver";
import { TagResolver } from "../src/resolver/tag.resolver";

/**
 * yarn ts-node ./scripts/tag-sync.ts
 *
 * This script will be run manually to sync all newly added bills and bills in current congress
 */

if (require.main === module) {
  new TagResolver().insertTags();
}
