import { peoplesFilterQuery } from "./filter";

export const getPeopleCustomizedQueries = (GraphQL, payload) => ({
  ...peoplesFilterQuery(GraphQL, payload),
})
