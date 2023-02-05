import "reflect-metadata";
import { FBPostResolver } from "../src/resolver/fb-post.resolver";

/**
 * yarn ts-node ./scripts/fb-posts-sync.ts
 */

if (require.main === module) {
  new FBPostResolver().crawlPosts().then(success => {
    console.log(success ? "done!" : "failed!");
  });
}
