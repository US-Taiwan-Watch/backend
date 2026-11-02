import {
  updateNameResolver,
  updateEmailResolver,
  updatePasswordResolver,
  deleteMeResolver
} from "../resolvers/auth"

export const updateNameMutation = (GraphQL, payload) => {
  return {
    updateMyName: {
      type: payload.collections.members.graphQL.type,
      args: {
        name: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: updateNameResolver
    }
  }
}

export const updateEmailMutation = (GraphQL, payload) => {
  return {
    updateMyEmail: {
      type: payload.collections.members.graphQL.type,
      args: {
        email: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: updateEmailResolver
    }
  }
}

export const updatePasswordMutation = (GraphQL, payload) => {
  return {
    updateMyPassword: {
      type: payload.collections.members.graphQL.type,
      args: {
        password: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: updatePasswordResolver
    }
  }
}

export const deleteMeMutation = (GraphQL, payload) => {
  return {
    deleteMe: {
      type: payload.collections.members.graphQL.type,
      resolve: deleteMeResolver
    }
  }
}
