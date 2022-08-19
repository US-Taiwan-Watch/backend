import { Resolver, Query, Arg, Args } from "type-graphql";
import { Article, ArticleStatus } from "../../common/models";
import { TableProvider } from "../mongodb/mongodb-manager";
import { ArticleTable } from "./article-table";

@Resolver(Article)
export class ArticleResolver extends TableProvider(ArticleTable) {
    // TODO: false for debugging. Should be true while in real use
    private static shouldSave() {
        return true;
    }

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
    public async articles(
        @Arg('ids') ids: string[],
    ): Promise<Article[] | null> {
        const tbl = await this.table();
        return await tbl.getArticles(ids);
    }

    public async addArticle(
        title: string,
        content: string,
        status: ArticleStatus,
        author: string,
        imageSource: string,
        tags: string[]
    ): Promise<Article | null> {
        const tbl = await this.table();
        const article = new Article(title, content, status, author, imageSource, tags);
        await tbl.createOrReplaceArticle(article);
        return this.article(article.id);
    }

    public async updateArticle(article: Article): Promise<Article | null> {
        const tbl = await this.table();
        await tbl.createOrReplaceArticle(article);

        return this.article(article.id);
    }

    public async deleteArticle(id: string) {
        const tbl = await this.table();
        return await tbl.deleteArticle(id);
    }
}
