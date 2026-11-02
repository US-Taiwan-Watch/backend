import {
  submitTaiwanRecordResolver,
  modifyTaiwanRecordResolver,
  withdrawTaiwanRecordResolver
} from "../resolvers/reviewRecord"

export const submitTaiwanRecordMutation = (GraphQL, payload) => {
  const baseInputType =
    payload.collections["taiwan-records"].graphQL.mutationInputType.ofType ||
    payload.collections["taiwan-records"].graphQL.mutationInputType;

  const filteredFields = Object.fromEntries(
    Object.entries(baseInputType.getFields()).filter(
      ([key]) => !["author", "status", "versions", "updatedAt", "createdAt"].includes(key)
    )
  );

  const FilteredInputType = new GraphQL.GraphQLInputObjectType({
    name: "mutationSubmitTaiwanRecordInput",
    fields: filteredFields,
  });

  return {
    submitTaiwanRecord: {
      type: payload.collections["taiwan-records"].graphQL.type,
      args: {
        data: {
          type: new GraphQL.GraphQLNonNull(FilteredInputType)
        },
      },
      resolve: submitTaiwanRecordResolver
    },
  }
}


export const modifyTaiwanRecordMutation = (GraphQL, payload) => {
  const baseInputType =
    payload.collections["taiwan-records"].graphQL.mutationInputType.ofType ||
    payload.collections["taiwan-records"].graphQL.mutationInputType;

  const filteredFields = Object.fromEntries(
    Object.entries(baseInputType.getFields()).filter(
      ([key]) => !["author", "status", "versions", "updatedAt", "createdAt"].includes(key)
    )
  );

  const FilteredInputType = new GraphQL.GraphQLInputObjectType({
    name: "mutationModifyTaiwanRecordInput",
    fields: filteredFields,
  });

  return {
    modifyTaiwanRecord: {
      type: payload.collections["taiwan-records"].graphQL.type,
      args: {
        id: {
          type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString),
        },
        data: {
          type: new GraphQL.GraphQLNonNull(FilteredInputType)
        },
        resubmitForReview: {
          type: GraphQL.GraphQLBoolean,
        },
      },
      resolve: modifyTaiwanRecordResolver
    },
  }
}

export const withdrawTaiwanRecordMutation = (GraphQL, payload) => {
  return {
    withdrawTaiwanRecord: {
      type: payload.collections["taiwan-records"].graphQL.type,
      args: {
        id: {
          type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString)
        },
      },
      resolve: withdrawTaiwanRecordResolver,
    }
  }
};
