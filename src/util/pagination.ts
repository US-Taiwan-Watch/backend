import { Field, ArgsType, ClassType, ObjectType, Int } from "type-graphql";
import { Article, Bill, Member } from "../../common/models";

@ArgsType()
export class PaginationArgs {
  @Field(() => Number, { nullable: true })
  offset?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;

  @Field(() => [String], { nullable: true })
  sortFields?: string[];

  @Field(() => [Number], { nullable: true })
  sortDirections?: number[];
}

export function PaginatedResponse<TItem extends { [key: string]: any }>(
  itemsFieldValue: ClassType<TItem> | string | number | boolean,
) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass {
    /**
     * Creates an instance of PaginatedResponseClass.
     *
     * @constructor
     * @param {PaginationArgs} pageInfo
     * @param {TItem[]} providedItems
     * @param {boolean} isPaginated - is the item list provided already paginated? if true, need to provide total count for generating the info
     * @param {?number} [providedTotal]
     */
    constructor(
      private pageInfo: PaginationArgs,
      private providedItems: TItem[],
      private isPaginated: boolean,
      private providedTotal: number = providedItems.length,
    ) {
      this.start = this.pageInfo.offset == null ? 0 : this.pageInfo.offset;
      this.end =
        this.pageInfo.limit == null
          ? this.providedItems.length
          : this.start + this.pageInfo.limit;
    }

    private start: number;
    private end: number;

    @Field(() => Int)
    total(): number {
      return this.isPaginated ? this.providedTotal : this.providedItems.length;
    }

    @Field()
    hasMore(): boolean {
      return this.end < this.total();
    }

    @Field(() => [itemsFieldValue])
    items(): TItem[] {
      if (this.isPaginated) {
        return this.providedItems;
      }
      return this.providedItems
        .sort((a, b) => {
          for (const i in this.pageInfo.sortFields!) {
            const field = this.pageInfo.sortFields[i];
            const aa: any = a[field] || "";
            const bb: any = b[field] || "";
            if (aa === bb) {
              continue;
            }
            const direction = this.pageInfo.sortDirections![i] || -1;
            return aa > bb ? direction : -direction;
          }
          return 0;
        })
        .splice(this.start, this.end);
    }
  }
  return PaginatedResponseClass;
}

@ObjectType()
export class PaginatedBills extends PaginatedResponse(Bill) {}

@ObjectType()
export class PaginatedMembers extends PaginatedResponse(Member) {}

@ObjectType()
export class PaginatedArticles extends PaginatedResponse(Article) {}
