import { meQuery } from "./me";
import { searchQuery } from "./search";

export const getMeInfoQueries = (GraphQL, payload) => ({
  ...meQuery(GraphQL, payload),
  ...searchQuery(GraphQL, payload),
})
