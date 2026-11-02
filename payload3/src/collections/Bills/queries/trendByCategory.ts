import { trendByCategoryResolver } from "../resolvers/trendByCategory"

export const trendByCategoryQuery = (GraphQL, payload) => {
  return {
    BillTrendByCategory: {
      type: new GraphQL.GraphQLList(
        new GraphQL.GraphQLObjectType({
          name: 'TrendByCategoryQuery',
          fields: {
            congress: { type: GraphQL.GraphQLInt },
            billCount: { type: GraphQL.GraphQLInt },
          },
        })
      ),
      args: {
        category: {
          type: GraphQL.GraphQLString,
        },
      },
      resolve: trendByCategoryResolver
    },
  }
}
