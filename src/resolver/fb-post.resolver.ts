import { TableProvider } from "../mongodb/mongodb-manager";
import { FBPostTable } from "./fb-post-table";
import {
  RequestHelper,
  RequestSource,
} from "../data-sync/sources/request-helper";
const ACCESS_TOKEN =
  "EAAM7oSUzZAcEBAIk4U33NZC5tyX3MUs9KOpYzYpZBZAQB21OZBYHyCWvsTZB9efW7WmZAjNitvZAhSjZCYgJyDOCuo9emObYRWZC8P0apF5IYHFGrKnTNsKKVnrtatvugGpKrMvz5H8BSD4PNTUP68x4mSapEtZBZASkjHpfI1zoKStr1YjH04HQMvWfAnRtpJI9QOEQmtr8PAyMRwZDZD";

const URL = `https://graph.facebook.com/v15.0/me/published_posts?debug=all&fields=message%2Ccreated_time%2Cid%2Cmessage_tags%2Cfull_picture&format=json&method=get&pretty=0&suppress_http_code=1&transport=cors&access_token=${ACCESS_TOKEN}`;

export class FBPostResolver extends TableProvider(FBPostTable) {
  public async crawlPosts(url?: string): Promise<boolean> {
    try {
      const res = await RequestHelper.from(RequestSource.FB).get(url || URL);
      const results = JSON.parse(res);
      const next = results.paging.next;
      const tbl = await this.table();
      await tbl.addItems(results.data.map((p: any) => ({ _id: p.id, ...p })));
      if (next) {
        return await this.crawlPosts(next);
      }
      return true;
    } catch (err) {
      console.error(err);
      console.log(`Continue with: ${url}`);
      return false;
    }
  }
}
