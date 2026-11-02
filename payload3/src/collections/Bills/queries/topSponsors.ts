import { topCosponsorsResolver, topSponsorsResolver } from "../resolvers/topSponsors"

export const topSponsorsQuery = (GraphQL, payload) => {
  return {
    BillTopSponsors: {
      type: new GraphQL.GraphQLList(
        new GraphQL.GraphQLObjectType({
          name: 'TopSponsorsQuery',
          fields: {
            billCount: { type: GraphQL.GraphQLInt },
            people: { type: payload.collections['peoples'].graphQL.type },
          },
        })
      ),
      args: {
        limit: {
          type: GraphQL.GraphQLInt,
        },
      },
      resolve: topSponsorsResolver
    },
  }
}

export const topCosponsorsQuery = (GraphQL, payload) => {
  return {
    BillTopCosponsors: {
      type: new GraphQL.GraphQLList(
        new GraphQL.GraphQLObjectType({
          name: 'TopCosponsorsQuery',
          fields: {
            billCount: { type: GraphQL.GraphQLInt },
            people: { type: payload.collections['peoples'].graphQL.type },
          },
        })
      ),
      args: {
        limit: {
          type: GraphQL.GraphQLInt,
        },
      },
      resolve: topCosponsorsResolver
    },
  }
}
