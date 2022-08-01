import { Field, ArgsType, ClassType, ObjectType, Int } from "type-graphql";
import { DenormalizedBill } from "../graphql/bill.model";

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
}

@ObjectType({ isAbstract: true })
export abstract class PaginatedResponseBase<TItem> {
  constructor(items: TItem[], pageInfo: PaginationArgs) {
    const start = pageInfo.offset == null ? 0 : pageInfo.offset;
    const end = pageInfo.limit == null ? undefined : start + pageInfo.limit;
    this.itemLists = items.slice(start, end);
    this.hasMore = end !== undefined && end < items.length;
    this.total = items.length;
  }

  itemLists!: TItem[];

  @Field(type => Int)
  total!: number;

  @Field()
  hasMore!: boolean;
}

export function PaginatedResponse<TItem>(
  itemsFieldValue: ClassType<TItem> | String | Number | Boolean,
) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass extends PaginatedResponseBase<TItem> {
    @Field(type => [itemsFieldValue])
    items(): TItem[] { return this.itemLists; }
  }
  return PaginatedResponseClass;
}

@ObjectType()
export class PaginatedBills extends PaginatedResponse(DenormalizedBill) { }
