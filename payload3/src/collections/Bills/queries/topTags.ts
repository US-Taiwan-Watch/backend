import { topTagsResolver } from "../resolvers/topTags";

export const topTagsQuery = (GraphQL, payload) => {
  return {
    BillTopTags: {
      type: new GraphQL.GraphQLList(
        new GraphQL.GraphQLObjectType({
          name: "TopTagsQuery",
          fields: {
            billCount: { type: GraphQL.GraphQLInt },
            tag: { type: payload.collections['tags'].graphQL.type },
          },
        })
      ),
      args: {
        limit: {
          type: GraphQL.GraphQLInt,
        },
      },
      resolve: topTagsResolver,
    },
  };
};
