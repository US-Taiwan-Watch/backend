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
import { NotionManager, NotionSyncable } from "../data-sync/notion-manager";
import { UpdateResult } from "mongodb";
import { v4 as uuid } from "uuid";
import { PublicJPGDownloader } from "../storage/public-jpg-downloader";
import { RequestSource } from "../data-sync/sources/request-helper";

@Resolver(Article)
export class ArticleResolver
  extends TableProvider(ArticleTable)
  implements NotionSyncable<Article>
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

  @Query(() => [Article])
  public async getAllArticles(@Ctx() ctx: IApolloContext): Promise<Article[]> {
    const tbl = await this.table();
    const articles = await tbl.getAllArticles();
    const canEdit = await authCheckHelper(ctx, ARTICLE_AUTHORIZED_ROLES);
    return articles.filter(a => !a.deleted && (canEdit || a.isPublished));
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

  getAllLocalItems(): Promise<Article[]> {
    throw new Error("Method not implemented.");
  }
  getPropertiesForDatabaseCreation() {
    throw new Error("Method not implemented.");
  }
  getPropertiesForItemCreation(_article: Article): Promise<any> {
    throw new Error("Method not implemented.");
  }
  getPropertiesForItemUpdating(_article: Article): Promise<any> {
    throw new Error("Method not implemented.");
  }
  updateLinkedLocalItem(_article: Article): Promise<UpdateResult> {
    throw new Error("Method not implemented.");
  }

  public async createOrUpdateLocalItems(
    pageObjects: any[],
  ): Promise<UpdateResult[]> {
    const tbl = await this.table();
    return await Promise.all(
      pageObjects.map(async pageObject => {
        const properties = pageObject.properties;
        if (properties["Publish"].checkbox) {
          const blocks = await NotionManager.getPageContents(pageObject.id);
          const text = blocks
            .filter((block: any) => block.paragraph)
            .map((block: any) =>
              block.paragraph.rich_text[0]
                ? block.paragraph.rich_text[0].text.content
                    .replace(/\n/g, "\\n")
                    .replace(/"/g, '\\"')
                : "",
            )
            .join("\\n");
          const image = (blocks.find((p: any) => p.image) as any)?.image?.file
            ?.url;

          let imageUrl = null;
          if (image) {
            const success = await new PublicJPGDownloader(
              image,
              `posts/${pageObject.id}`,
              RequestSource.UNLIMITED,
            ).downloadAndUpload();
            if (!success) {
              throw new Error("upload image failed");
            }
            imageUrl = `https://static.ustw.watch/public-image/posts/${pageObject.id}.jpg`;
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
                content: `{"id":"yqsyyd","version":1,"rows":[{"id":"518dnt","cells":[{"id":"72dy7s","size":12,"plugin":{"id":"ory/editor/core/content/slate","version":1},"dataI18n":{"zh":{"slate":[{"type":"PARAGRAPH/PARAGRAPH","children":[{"text":"${text}"}]}]}},"rows":[],"inline":null}]}]}`,
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
                isPublished: true,
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
        }
        // Update to draft if not published
        return await tbl.updateItemByCustomQuery<Article>(
          { notionPageId: pageObject.id },
          {
            $set: {
              isPublished: false,
            },
          },
        );
      }),
    );
  }

  async deleteNotFoundLocalItems(_: string[]): Promise<any[]> {
    return [];
  }
}
