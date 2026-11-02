import {
  bookmarkUstwArticleResolver,
  bookmarkKetagalanArticleResolver,
  unbookmarkUstwArticleResolver,
  unbookmarkKetagalanArticleResolver
} from "../resolvers/bookmark"

export const bookmarkUstwArticleMutation = (GraphQL, payload) => {
  return {
    bookmarkUstwArticle: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: bookmarkUstwArticleResolver
    }
  }
}

export const unbookmarkUstwArticleMutation = (GraphQL, payload) => {
  return {
    unbookmarkUstwArticle: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: unbookmarkUstwArticleResolver
    }
  }
}

export const bookmarkKetagalanArticleMutation = (GraphQL, payload) => {
  return {
    bookmarkKetagalanArticle: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: bookmarkKetagalanArticleResolver
    }
  }
}

export const unbookmarkKetagalanArticleMutation = (GraphQL, payload) => {
  return {
    unbookmarkKetagalanArticle: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: unbookmarkKetagalanArticleResolver
    }
  }
}
