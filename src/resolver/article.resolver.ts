import {
  Resolver,
  Query,
  Arg,
  Mutation,
  FieldResolver,
  Root,
  Ctx,
  Authorized,
  Args,
} from "type-graphql";
import {
  Article,
  ArticleType,
  User,
  Auth0RoleName,
  ARTICLE_AUTHORIZED_ROLES,
  I18NText,
  I18NTextInput,
  ArticleTypeArgs,
} from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { IApolloContext } from "../@types/common.interface";
import { ArticleTable } from "./article-table";
import { UserResolver } from "./user.resolver";
import { authCheckHelper } from "../util/auth-helper";
import { NotionManager } from "../data-sync/notion-manager";
import { UpdateResult } from "mongodb";
import { v4 as uuid } from "uuid";
import { PublicJPGDownloader } from "../storage/public-jpg-downloader";
import { RequestSource } from "../data-sync/sources/request-helper";
import { SyncFromNotion } from "./notion-sync.resolver";
import { PaginatedArticles, PaginationArgs } from "../util/pagination";

@Resolver(Article)
export class ArticleResolver
  extends TableProvider(ArticleTable)
  implements SyncFromNotion
{
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

  // TODO: to be deprecated
  @Query(() => [Article])
  public async getAllArticles(@Ctx() ctx: IApolloContext): Promise<Article[]> {
    const tbl = await this.table();
    const articles = await tbl.getAllArticles();
    const canEdit = await authCheckHelper(ctx, ARTICLE_AUTHORIZED_ROLES);
    return articles.filter(a => !a.deleted && (canEdit || a.isPublished));
  }

  @Query(() => PaginatedArticles)
  public async getPostsWithType(
    @Ctx() ctx: IApolloContext,
    @Args() pageInfo: PaginationArgs,
    @Args() typeArgs: ArticleTypeArgs,
    additionalQuery?: any,
  ): Promise<PaginatedArticles> {
    const tbl = await this.table();
    const canEdit = await authCheckHelper(ctx, ARTICLE_AUTHORIZED_ROLES);

    const query = {
      deleted: false,
      ...(canEdit ? {} : { isPublished: true }),
      type: typeArgs.type,
      ...additionalQuery,
    };

    let sort = {};
    if (pageInfo.sortFields && pageInfo.sortDirections) {
      sort = Object.fromEntries(
        pageInfo.sortFields.map((field, i) => [
          field,
          pageInfo.sortDirections![i],
        ]),
      );
    }

    const [posts, count] = await tbl.queryItemsWithTotalCount<Article>(
      query,
      pageInfo.offset,
      pageInfo.limit,
      sort,
    );
    return new PaginatedArticles(pageInfo, posts, true, count);
  }

  @Query(() => PaginatedArticles)
  public async getPublicArticlesAfter(
    @Ctx() ctx: IApolloContext,
    @Arg("slug") slug: string,
    @Args() pageInfo: PaginationArgs,
  ): Promise<PaginatedArticles> {
    const article = await this.getPublicArticle(ctx, slug);
    if (!article) {
      return new PaginatedArticles(pageInfo, [], true, 0);
    }
    return this.getPostsWithType(
      ctx,
      pageInfo,
      { type: article.type || ArticleType.ARTICLE },
      Object.fromEntries(
        pageInfo.sortFields?.map((field, i) => [
          field,
          { [pageInfo.sortDirections![i] > 0 ? "$gt" : "$lt"]: article[field] },
        ]) || [],
      ),
    );
  }

  @Query(() => Article, { nullable: true })
  public async getPublicArticle(
    @Ctx() ctx: IApolloContext,
    @Arg("slug") slug: string,
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
      title,
      content,
      slug,
      preview,
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

  public async createOrUpdateLocalItems(
    pageObjects: any[],
  ): Promise<UpdateResult[]> {
    const tbl = await this.table();
    return await Promise.all(
      pageObjects.map(async pageObject => {
        const properties = pageObject.properties;
        const blocks = await NotionManager.getPageContents(pageObject.id);
        const text = blocks
          .filter((block: any) => block.paragraph)
          .map((block: any) =>
            block.paragraph.rich_text[0]
              ? block.paragraph.rich_text[0].text.content
              : "",
          )
          .join("\n");
        const textForJSON = text.replace(/\n/g, "\\n").replace(/"/g, '\\"');
        const image = (blocks.find((p: any) => p.image) as any)?.image?.file
          ?.url;

        let imageUrl = null;
        if (image) {
          const downloader = new PublicJPGDownloader(
            image,
            `posts/${pageObject.id}`,
            RequestSource.UNLIMITED,
          );
          const success = await downloader.downloadAndUpload();
          if (!success) {
            throw new Error("upload image failed");
          }
          imageUrl = downloader.getPublicUrl();
        }

        return await tbl.upsertItemByCustomQuery<Article>(
          { notionPageId: pageObject.id },
          {
            $set: {
              title: {
                zh: properties["標題"].title
                  .map((part: any) => part.text.content)
                  .join(""),
              },
              content: `{"id":"yqsyyd","version":1,"rows":[{"id":"518dnt","cells":[{"id":"72dy7s","size":12,"plugin":{"id":"ory/editor/core/content/slate","version":1},"dataI18n":{"zh":{"slate":[{"type":"PARAGRAPH/PARAGRAPH","children":[{"text":"${textForJSON}"}]}]}},"rows":[],"inline":null}]}]}`,
              text,
              authors: ["google-oauth2|117639421567357025264"],
              imageSource: imageUrl,
              type: 1,
              createdTime: new Date(
                properties["Created time"].created_time,
              ).getTime(),
              lastModifiedTime: new Date(
                properties["最近編輯時間"].last_edited_time,
              ).getTime(),
              tags: [],
              deleted: false,
              isPublished: properties["Publish"].checkbox,
              publishedTime: new Date(
                properties["發布時間"].date?.start ||
                  properties["最近編輯時間"].last_edited_time,
              ).getTime(),
            },
            $setOnInsert: {
              _id: uuid(),
            },
          },
        );
      }),
    );
  }

  public async updateRelations(pageObjects: any[]): Promise<UpdateResult[]> {
    return [];
    // const tbl = await this.table();
    // const idMappings = await tbl.getAllArticles();
    // return await Promise.all(
    //   pageObjects.map(async pageObject => {
    //     const properties = pageObject.properties;
    //     const relatedNotionPageIds = properties["相關文章"].relation.map(
    //       (r: any) => idMappings.find(v => v.notionPageId === r.id)?.id,
    //     );
    //     return await tbl.updateItemByCustomQuery(
    //       { notionPageId: pageObject.id },
    //       {
    //         $set: {
    //           relatedArticleIds: relatedNotionPageIds,
    //         },
    //       },
    //     );
    //   }),
    // );
  }

  async deleteNotFoundLocalItems(notionPageIds: string[]): Promise<number> {
    const tbl = await this.table();
    const updateResult = await tbl.updateItemsByCustomQuery<Article>(
      {
        notionPageId: { $nin: notionPageIds },
        fbPostId: { $exists: false },
        type: ArticleType.ARTICLE,
      },
      {
        $set: {
          deleted: true,
        },
      },
    );
    return updateResult.modifiedCount;
  }
}
