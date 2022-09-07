import { Resolver, Query, Arg, Args, Mutation } from "type-graphql";
import { Article, ArticleStatus } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { ArticleTable } from "./article-table";

@Resolver(Article)
export class ArticleResolver extends TableProvider(ArticleTable) {
    @Query(() => [Article], { nullable: false })
    public async allArticles(): Promise<Article[]> {
        const tbl = await this.table();
        return await tbl.getAllArticles();
    }

    @Query(() => Article, { nullable: true })
    public async article(
        @Arg('id') id: string,
    ): Promise<Article | null> {
        const tbl = await this.table();
        return await tbl.getArticle(id);
    }

    @Query(() => Article, { nullable: true })
    public async articleBySlug(
        @Arg('slug') slug: string,
    ): Promise<Article | null> {
        const tbl = await this.table();
        let article = await tbl.getArticleBySlug(slug);
        if (!article) {
            article = await this.article(slug);
        }
        return article;
    }

    @Query(() => [Article], { nullable: true })
    public async articles(
        @Arg('ids', () => [String]) ids: string[],
    ): Promise<Article[] | null> {
        const tbl = await this.table();
        return await tbl.getArticles(ids);
    }

    @Mutation(() => Article, { nullable: true })
    public async createEmptyArticle(): Promise<Article | null> {
        const tbl = await this.table();
        const article = new Article();
        article.createdTime = Date.now().valueOf();
        article.lastModifiedTime = article.createdTime;
        await tbl.createOrReplaceArticle(article);
        return this.article(article.id);
    }

    @Mutation(() => Article, { nullable: true })
    public async addArticle(
        @Arg("title", { nullable: true }) title?: string,
        @Arg("content", { nullable: true }) content?: string,
        @Arg("slug", { nullable: true }) slug?: string,
        @Arg("preview", { nullable: true }) preview?: string,
        @Arg("isPublished", { nullable: true }) isPublished?: boolean,
        @Arg("authors", () => [String], { nullable: true }) authors?: string[],
        @Arg("imageSource", { nullable: true }) imageSource?: string,
        @Arg("tags", () => [String], { nullable: true }) tags?: string[]
    ): Promise<Article | null> {
        const tbl = await this.table();
        const article = new Article(title, content, slug, preview, isPublished, authors, imageSource, tags);
        article.createdTime = Date.now().valueOf();
        article.lastModifiedTime = article.createdTime;
        await tbl.createOrReplaceArticle(article);
        return this.article(article.id);
    }

    @Mutation(() => Article, { nullable: true })
    public async updateArticleWithId(
        @Arg('id') id: string,
        @Arg("title", { nullable: true }) title?: string,
        @Arg("content", { nullable: true }) content?: string,
        @Arg("slug", { nullable: true }) slug?: string,
        @Arg("preview", { nullable: true }) preview?: string,
        @Arg("isPublished", { nullable: true }) isPublished?: boolean,
        @Arg("authors", () => [String], { nullable: true }) authors?: string[],
        @Arg("imageSource", { nullable: true }) imageSource?: string,
        @Arg("tags", () => [String], { nullable: true }) tags?: string[]): Promise<Article | null> {
        const article = <Article>{
            id,
            title,
            content,
            slug,
            preview,
            isPublished,
            authors,
            imageSource,
            tags
        };
        article.lastModifiedTime = Date.now().valueOf();
        if (isPublished) {
            article.pusblishTime = Date.now().valueOf();
        }
        const tbl = await this.table();
        await tbl.updateArticle(id, article);
        return this.article(article.id);
    }

    @Mutation(() => Boolean, { nullable: true })
    public async deleteArticle(@Arg('id') id: string) {
        const tbl = await this.table();
        const result = await tbl.deleteArticle(id);
        return result.deletedCount > 0;
    }
}
