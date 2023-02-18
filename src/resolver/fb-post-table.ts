import { MongoDBTableBase } from "../mongodb/mongodb-manager";

export class FBPostTable extends MongoDBTableBase("fb_posts2") {
  public addPosts(article: any[]) {
    return this.addItems(article);
  }

  public updatePost(id: string, found: boolean) {
    this.updateItemByObjectId(id, { found_in_dp: found });
  }

  public queryAllNotCleared() {
    return this.queryItemsWorking({ found_in_dp: { $exists: false } });
  }
}
