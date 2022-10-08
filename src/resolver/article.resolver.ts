import {
    Resolver,
    Query,
    Arg,
    Mutation,
    FieldResolver,
    Root,
    Ctx
} from "type-graphql";
import { Article, ArticleType, User, ArticleStatus, Auth0RoleName } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { IApolloContext } from "../@types/common.interface";
import { ArticleTable } from "./article-table";
import { UserResolver } from "./user.resolver";
import { Auth0Management } from "../auth0/auth0-management";

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

    @Query(() => [Article], { nullable: false })
    public async allArticles(
        @Ctx() ctx: IApolloContext
    ): Promise<Article[]> {
        const userId = ctx.currentUser && ctx.currentUser.sub;
        const roles = await Auth0Management.api.getRoles(userId);
        const tbl = await this.table();
        if (roles.includes(Auth0RoleName.Admin)) {
            return await tbl.getAllArticles();
        }
        else {
            return await (await tbl.getAllArticles()).filter(a => a.isPublished);
        }
    }

    @Query(() => Article, { nullable: true })
    public async article(@Arg("id") id: string): Promise<Article | null> {
        const tbl = await this.table();
        return await tbl.getArticle(id);
    }

    @Query(() => Article, { nullable: true })
    public async publicArticle(
        @Arg("slug") slug: string,
    ): Promise<Article | null> {
        const tbl = await this.table();
        let article = await tbl.getPublicArticle(slug);
        if (!article) {
            article = await this.article(slug);
        }
        return article;
    }

    @Mutation(() => Article, { nullable: true })
    public async createEmptyArticle(
        @Ctx() ctx: IApolloContext
    ): Promise<Article | null> {
        const userName = ctx.currentUser && ctx.currentUser.name;
        const tbl = await this.table();
        const article = new Article();
        article.createdTime = Date.now().valueOf();
        article.lastModifiedTime = article.createdTime;
        article.authors = [userName];
        await tbl.createOrReplaceArticle(article);
        return this.article(article.id);
    }

    @Query(() => [Article], { nullable: true })
    public async articles(
        @Arg("ids", () => [String]) ids: string[],
    ): Promise<Article[] | null> {
        const tbl = await this.table();
        return await tbl.getArticles(ids);
    }

    @Mutation(() => Article, { nullable: true })
    public async addArticle(
        @Ctx() ctx: IApolloContext,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("content", { nullable: true }) content?: string,
        @Arg("slug", { nullable: true }) slug?: string,
        @Arg("preview", { nullable: true }) preview?: string,
        @Arg("isPublished", { nullable: true }) isPublished?: boolean,
        @Arg("authors", () => [String], { nullable: true }) authors?: string[],
        @Arg("imageSource", { nullable: true }) imageSource?: string,
        @Arg("tags", () => [String], { nullable: true }) tags?: string[],
        @Arg("type", () => ArticleType, { nullable: true }) type?: ArticleType,
    ): Promise<Article | null> {
        const tbl = await this.table();
        const userName = ctx.currentUser && ctx.currentUser.name;
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
        article.authors = [userName];
        await tbl.createOrReplaceArticle(article);
        return this.article(article.id);
    }

    @Mutation(() => Article, { nullable: true })
    public async updateArticleWithId(
        @Ctx() ctx: IApolloContext,
        @Arg('id') id: string,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("content", { nullable: true }) content?: string,
        @Arg("slug", { nullable: true }) slug?: string,
        @Arg("preview", { nullable: true }) preview?: string,
        @Arg("isPublished", { nullable: true }) isPublished?: boolean,
        @Arg("authors", () => [String], { nullable: true }) authors?: string[],
        @Arg("imageSource", { nullable: true }) imageSource?: string,
        @Arg("tags", () => [String], { nullable: true }) tags?: string[],
        @Arg("type", () => ArticleType, { nullable: true }) type?: ArticleType, ): Promise<Article | null> {
        const tbl = await this.table();
        const userId = ctx.currentUser && ctx.currentUser.sub;
        const originalArticle = await tbl.getArticle(id);
        const article = <Article>{
            id,
        };

        if (content !== undefined) {
            article.content = content
        }

        if (slug !== undefined) {
            article.slug = slug
        }

        if (preview !== undefined) {
            article.preview = preview
        }

        if (isPublished !== undefined) {
            article.isPublished = isPublished
            if (!originalArticle?.isPublished && isPublished) {
                article.pusblishTime = Date.now().valueOf();
            }
        }

        if (authors !== undefined) {
            article.authors = authors
        }

        if (imageSource !== undefined) {
            article.imageSource = imageSource
        }

        if (tags !== undefined) {
            article.tags = tags
        }

        if (type !== undefined) {
            article.type = type;
        }

        article.lastModifiedTime = Date.now().valueOf();

        await tbl.updateArticle(id, article);
        return this.article(article.id);
    }

    @Mutation(() => Boolean, { nullable: true })
    public async deleteArticle(@Arg("id") id: string) {
        const tbl = await this.table();
        const result = await tbl.deleteArticle(id);
        return result.deletedCount > 0;
    }
}
