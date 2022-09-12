import { MongoDBTableBase } from "../mongodb/mongodb-manager";
import { Article } from "../../common/models";
import * as _ from "lodash";

export class ArticleTable extends MongoDBTableBase("articles") {
    public addArticle(article: Article) {
        return this.putItem(article);
    }

    public async getArticles(ids: string[], ...attrNamesToGet: (keyof Article)[]): Promise<Article[]> {
        return await this.getItems<Article>('_id', ids, attrNamesToGet);
    }

    public async getAllArticles(): Promise<Article[]> {
        return await this.getAllItems<Article>();
    }

    public getArticle(id: string, ...attrNamesToGet: (keyof Article)[]): Promise<Article | null> {
        return this.getItem<Article>('_id', id, attrNamesToGet);
    }

    public getPublicArticle(slug: string, ...attrNamesToGet: (keyof Article)[]): Promise<Article | null> {
        return this.getItem<Article>('slug', slug, attrNamesToGet);
    }

    public updateArticle(id: string, update: Partial<Article>) {
        return this.updateItemByObjectId<Article>(id, update);
    }

    public async createOrReplaceArticle(article: Article) {
        const existing = await this.getArticle(article.id);
        if (existing) {
            const { id, ...updateArticle } = article;
            this.updateArticle(article.id, updateArticle);
        } else {
            this.addArticle(article);
        }
    }

    public deleteArticle(id: string) {
        return this.deleteItems(new Array(id))
    }

    public deleteArticles(ids: string[]) {
        return this.deleteItems(ids)
    }

}