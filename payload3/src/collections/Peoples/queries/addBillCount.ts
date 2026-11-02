import { addBillCountPeopleResolver } from "../resolvers/addBillCount"

export const addBillCountPeopleQuery = (GraphQL, payload) => {
  return {
    AddBillCountPeopleQuery: {
      type: new GraphQL.GraphQLObjectType({
        name: 'AddBillCountPeopleQuery',
        fields: {
          fullName: {
            type: GraphQL.GraphQLString,
          },
          billCount: {
            type: GraphQL.GraphQLInt,
          },
        },
        // fields: () => {
        //   const fields = {}
        //   payload.collections['bills'].config.fields.map(field => fields[field.name] = { type: field.type })
        //   console.log({
        //     ...fields,
        //     billCount: { type: GraphQL.GraphQLInt },
        //   })
        //   return {
        //     ...fields,
        //     billCount: { type: GraphQL.GraphQLInt },
        //   };
        // },
      }),
      args: {
        id: {
          type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString),
        },
      },
      resolve: addBillCountPeopleResolver,
    },
  }
}
