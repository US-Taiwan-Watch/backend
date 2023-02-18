import { TableProvider } from "../mongodb/mongodb-manager";
import { FBPostTable } from "./fb-post-table";
import {
  RequestHelper,
  RequestSource,
} from "../data-sync/sources/request-helper";
import { readFileSync } from "fs";
import { PublicJPGDownloader } from "../storage/public-jpg-downloader";

// Get token https://developers.facebook.com/tools/explorer/
const ACCESS_TOKEN = "it expires every time";

const URL = `https://graph.facebook.com/v15.0/me/published_posts?debug=all&fields=message%2Ccreated_time%2Cid%2Cmessage_tags%2Cfull_picture%2Cupdated_time&format=json&method=get&pretty=0&suppress_http_code=1&transport=cors&access_token=${ACCESS_TOKEN}`;

export class FBPostResolver extends TableProvider(FBPostTable) {
  public async crawlPosts(
    url?: string,
    jobs: Array<any> = [],
  ): Promise<boolean> {
    try {
      const res = await RequestHelper.from(RequestSource.FB).get(url || URL);
      const results = JSON.parse(res);
      const next = results.paging.next;
      const tbl = await this.table();

      jobs = [
        ...jobs,
        ...results.data
          .filter((p: any) => p.full_picture)
          .map((p: any) =>
            new PublicJPGDownloader(
              p.full_picture,
              `posts/${p.id}`,
              RequestSource.FB_CDN,
            ).downloadAndUpload(),
          ),
      ];
      await tbl.addItems(results.data.map((p: any) => ({ _id: p.id, ...p })));
      if (next) {
        return await this.crawlPosts(next, jobs);
      }
      await Promise.allSettled(jobs);
      console.log("All downloaded");
      return true;
    } catch (err) {
      console.error(err);
      console.log(`Continue with: ${url}`);
      return false;
    }
  }

  public async compare() {
    const tbl = await this.table();
    const posts = await tbl.queryAllNotCleared();
    const data = readFileSync(
      "/Users/cwhsu/mine/backend/src/resolver/all_articles.txt",
      "utf-8",
    );
    function foundFun(p: any) {
      if (!p.message) {
        return false;
      }
      const message = (p.message as string).replace("/​/g", "");
      const index = message.indexOf("\n");
      const line = index < 0 ? message : message.substring(0, index);
      if (line.length > 60) {
        return false;
      }
      let line2 = line.substring(0, 10);
      let found = data.includes(line2);
      if (found) {
        return true;
      }
      line2 = line.substring(line.length - 10, line.length);
      found = data.includes(line2);
      if (found) {
        return true;
      }
      p.message_tags?.map((tag: any) => {
        if (tag.name === "#觀測站底加辣") {
          return false;
        }
        if (tag.name[0] === "#") {
          found = data.includes(tag.name);
          if (found) {
            return true;
          }
        }
      });
      if (line !== line.replace(/[\s]Ep[\s]*[0-9]{1,2}[^0-9]/gi, "")) {
        return false;
      }
      if (line !== line.replace(/^Ep[\s]*[0-9]{1,2}[^0-9]/gi, "")) {
        return false;
      }
      if (line !== line.replace(/觀測站讀書會/g, "")) {
        return false;
      }
      if (line !== line.replace(/觀測站專題/g, "")) {
        return false;
      }

      const lines = message.split("\n");
      for (let l of lines) {
        l = l.substring(2, l.length - 2);
        if (l.length > 20 && data.includes(l)) {
          return true;
        }
      }
    }
    let count = 0;
    for (const i in posts) {
      const p: any = posts[i];
      const f = foundFun(p);
      if (f === true) {
        count++;
      }
      if (f !== undefined) tbl.updatePost(p.id, f);
    }
    console.log(count);
    return true;
  }
}
