import {
  Resolver,
  Query,
  Arg,
  Mutation,
  FieldResolver,
  Root,
  Ctx,
  Authorized,
} from "type-graphql";
import {
  Article,
  ArticleType,
  User,
  Auth0RoleName,
  ARTICLE_AUTHORIZED_ROLES,
  I18NText,
  I18NTextInput,
} from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { IApolloContext } from "../@types/common.interface";
import { ArticleTable } from "./article-table";
import { UserResolver } from "./user.resolver";
import { authCheckHelper } from "../util/auth-helper";

@Resolver(Article)
export class ArticleResolver extends TableProvider(ArticleTable) {
  @FieldResolver()
  public async authorInfos(@Root() article: Article): Promise<User[]> {
    if (!article.authors) {
      return [];
    }
    return (await new UserResolver().getUsers(article.authors)).map(user => ({
      ...user,
      name: user.name || user.email,
    }));
  }

  @FieldResolver()
  public type(@Root() article: Article): ArticleType {
    return article.type || ArticleType.ARTICLE;
  }

  @Query(() => [Article])
  public async getAllArticles(
    @Ctx() ctx: IApolloContext,
    @Arg("lang", { nullable: true }) _lang?: string,
  ): Promise<Article[]> {
    const tbl = await this.table();
    const articles = await tbl.getAllArticles();
    const canEdit = await authCheckHelper(ctx, ARTICLE_AUTHORIZED_ROLES);
    return articles.filter(a => !a.deleted && (canEdit || a.isPublished));
  }

  @Query(() => Article, { nullable: true })
  public async getPublicArticle(
    @Ctx() ctx: IApolloContext,
    @Arg("slug") slug: string,
    @Arg("lang", { nullable: true }) _lang?: string,
  ): Promise<Article | null> {
    const tbl = await this.table();
    let article = await tbl.getArticleBySlug(slug);
    if (!article) {
      article = await this.getArticle(slug);
    }
    if (!article?.isPublished || article.deleted) {
      const canEdit = await authCheckHelper(ctx, ARTICLE_AUTHORIZED_ROLES);
      if (!canEdit) {
        return null;
      }
    }
    return article;
  }

  // Authorized methods

  @Authorized<Auth0RoleName>(ARTICLE_AUTHORIZED_ROLES)
  @Query(() => Article, { nullable: true })
  public async getArticle(@Arg("id") id: string): Promise<Article | null> {
    const tbl = await this.table();
    return await tbl.getArticle(id);
  }

  @Authorized<Auth0RoleName>(ARTICLE_AUTHORIZED_ROLES)
  @Mutation(() => Article, { nullable: true })
  public async addArticle(
    @Ctx() ctx: IApolloContext,
    @Arg("title", { nullable: true }) title?: I18NTextInput,
    @Arg("content", { nullable: true }) content?: string,
    @Arg("slug", { nullable: true }) slug?: string,
    @Arg("preview", { nullable: true }) preview?: I18NTextInput,
    @Arg("isPublished", { nullable: true }) isPublished?: boolean,
    @Arg("authors", () => [String], { nullable: true }) authors?: string[],
    @Arg("imageSource", { nullable: true }) imageSource?: string,
    @Arg("tags", () => [String], { nullable: true }) tags?: string[],
    @Arg("type", () => ArticleType, { nullable: true }) type?: ArticleType,
  ): Promise<Article | null> {
    const tbl = await this.table();
    const userId = ctx.currentUser && ctx.currentUser.sub;
    const article = new Article(
      new I18NText(title),
      content,
      slug,
      new I18NText(preview),
      isPublished,
      authors,
      imageSource,
      tags,
      type,
    );
    article.createdTime = Date.now().valueOf();
    article.lastModifiedTime = article.createdTime;
    article.authors = [userId];
    await tbl.createOrReplaceArticle(article);
    return this.getArticle(article.id);
  }

  @Authorized<Auth0RoleName>(ARTICLE_AUTHORIZED_ROLES)
  @Mutation(() => Article, { nullable: true })
  public async updateArticleWithId(
    @Ctx() ctx: IApolloContext,
    @Arg("id") id: string,
    @Arg("title", { nullable: true }) title?: I18NTextInput,
    @Arg("content", { nullable: true }) content?: string,
    @Arg("slug", { nullable: true }) slug?: string,
    @Arg("preview", { nullable: true }) preview?: I18NTextInput,
    @Arg("isPublished", { nullable: true }) isPublished?: boolean,
    @Arg("authors", () => [String], { nullable: true }) authors?: string[],
    @Arg("imageSource", { nullable: true }) imageSource?: string,
    @Arg("tags", () => [String], { nullable: true }) tags?: string[],
    @Arg("type", () => ArticleType, { nullable: true }) type?: ArticleType,
    @Arg("publishedTime", { nullable: true }) publishedTime?: number,
  ): Promise<Article | null> {
    const tbl = await this.table();
    const originalArticle = await tbl.getArticle(id);
    const article = <Article>{
      id,
    };

    if (title) {
      article.title = <I18NText>{ ...originalArticle?.title, ...title };
    }

    if (content !== undefined) {
      article.content = content;
    }

    if (slug !== undefined) {
      article.slug = slug;
    }


    if (title) {
      article.preview = <I18NText>{ ...originalArticle?.preview, ...preview };
    }

    if (isPublished !== undefined) {
      article.isPublished = isPublished;
      if (!originalArticle?.isPublished && isPublished) {
        article.publishedTime = Date.now().valueOf();
      }
    }

    if (publishedTime) {
      article.publishedTime = publishedTime;
    }

    if (authors !== undefined) {
      article.authors = authors;
    }

    if (imageSource !== undefined) {
      article.imageSource = imageSource;
    }

    if (tags !== undefined) {
      article.tags = tags;
    }

    if (type !== undefined) {
      article.type = type;
    }

    article.lastModifiedTime = Date.now().valueOf();

    await tbl.updateArticle(id, article);
    return this.getArticle(article.id);
  }

  @Authorized<Auth0RoleName>(ARTICLE_AUTHORIZED_ROLES)
  @Mutation(() => Boolean)
  public async deleteArticle(@Arg("id") id: string) {
    const tbl = await this.table();
    const result = await tbl.updateArticle(id, { deleted: true });
    return result.modifiedCount > 0;
  }
}
