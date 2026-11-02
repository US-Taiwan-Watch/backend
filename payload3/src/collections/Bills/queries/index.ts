import { billsFilterQuery } from "./filter";
import { topCosponsorsQuery, topSponsorsQuery } from "./topSponsors";
import { topTagsQuery } from "./topTags";
import { trendByCategoryQuery } from "./trendByCategory";

export const getBillCustomizedQueries = (GraphQL, payload) => ({
  ...trendByCategoryQuery(GraphQL, payload),
  ...topSponsorsQuery(GraphQL, payload),
  ...topCosponsorsQuery(GraphQL, payload),
  ...topTagsQuery(GraphQL, payload),
  ...billsFilterQuery(GraphQL, payload),
})
