import { MongoDBTableBase } from "../mongodb/mongodb-manager";

export class FBPostTable extends MongoDBTableBase("fb_posts") {
  public addArticles(article: any[]) {
    return this.addItems(article);
  }
}
