import { Field, ObjectType } from "type-graphql";
import { Article, User } from "../../common/models";
import { UserResolver } from "../resolver/user.resolver";

@ObjectType()
export class DenormalizedArticle extends Article {
  static from(article: Article | null) {
    if (!article) {
      return null;
    }
    return new this(article);
  }

  constructor(article: Article) {
    super();
    Object.assign(this, article);
  }

  @Field(() => [User])
  public async authorInfos(): Promise<User[]> {
    const editors = await new UserResolver().editors();
    return this.authors?.map(id => editors.find(user => user.id === id)!) || [];
  }

}
