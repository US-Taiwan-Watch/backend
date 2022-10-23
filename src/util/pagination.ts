import { Field, ArgsType, ClassType, ObjectType, Int } from "type-graphql";
import { Bill } from "../../common/models";

export abstract class Pagination {
  public static getPaginatedList<T>(items: T[], pageInfo: PaginationArgs): T[] {
    const start = pageInfo.offset == null ? 0 : pageInfo.offset;
    const end = pageInfo.limit == null ? undefined : start + pageInfo.limit;
    return items.slice(start, end);
  }
}

@ArgsType()
export class PaginationArgs {
  @Field(() => Number, { nullable: true })
  offset?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;

  @Field(() => [String], { nullable: true })
  sortFields: string[] = [];

  @Field(() => [Number], { nullable: true })
  sortDirections: number[] = [];
}

export function PaginatedResponse<TItem extends { [key: string]: any }>(
  itemsFieldValue: ClassType<TItem> | string | number | boolean,
) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass {
    constructor(allItems: TItem[], pageInfo: PaginationArgs) {
      const start = pageInfo.offset == null ? 0 : pageInfo.offset;
      const end = pageInfo.limit == null ? undefined : start + pageInfo.limit;

      this.items = allItems;
      if (
        pageInfo.sortFields.length > 0 &&
        pageInfo.sortDirections.length > 0
      ) {
        this.items = this.items.sort((a, b) => {
          for (const i in pageInfo.sortFields) {
            const field = pageInfo.sortFields[i];
            const aa: any = a[field] || "";
            const bb: any = b[field] || "";
            if (aa === bb) {
              continue;
            }
            const direction = pageInfo.sortDirections[i] || -1;
            return aa > bb ? direction : -direction;
          }
          return 0;
        });
      }
      this.items = this.items.slice(start, end);

      this.hasMore = end !== undefined && end < allItems.length;
      this.total = allItems.length;
    }

    @Field(() => Int)
    total!: number;

    @Field()
    hasMore!: boolean;

    @Field(() => [itemsFieldValue])
    items!: TItem[];
  }
  return PaginatedResponseClass;
}

@ObjectType()
export class PaginatedBills extends PaginatedResponse(Bill) {}
