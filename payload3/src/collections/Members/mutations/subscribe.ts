import {
  subscribeBillResolver,
  subscribePeopleResolver,
  unsubscribeBillResolver,
  unsubscribePeopleResolver
} from "../resolvers/subscribe"

export const subscribeBillMutation = (GraphQL, payload) => {
  return {
    subscribeBill: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: subscribeBillResolver
    }
  }
}

export const unsubscribeBillMutation = (GraphQL, payload) => {
  return {
    unsubscribeBill: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: unsubscribeBillResolver,
    },
  };
};

export const subscribePeopleMutation = (GraphQL, payload) => {
  return {
    subscribePeople: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: subscribePeopleResolver
    }
  }
}

export const unsubscribePeopleMutation = (GraphQL, payload) => {
  return {
    unsubscribePeople: {
      type: payload.collections.members.graphQL.type,
      args: {
        id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: unsubscribePeopleResolver,
    },
  };
};
