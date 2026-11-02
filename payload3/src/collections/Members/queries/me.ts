import { meResolver } from "../resolvers/me";

// export const meQuery = (GraphQL, payload) => {
//   return {
//     Me: {
//       type: new GraphQL.GraphQLObjectType({
//         name: "Me",
//         fields: {
//           provider: { type: GraphQL.GraphQLString },
//           providerId: { type: GraphQL.GraphQLString },
//           fullName: { type: GraphQL.GraphQLString },
//           email: { type: GraphQL.GraphQLString },
//           subscribeBills: {
//             type: new GraphQL.GraphQLList(
//               payload.collections["bills"].graphQL.type
//             )
//           },
//           subscribePeoples: {
//             type: new GraphQL.GraphQLList(
//               payload.collections["peoples"].graphQL.type
//             ),
//           },
//           bookmarkUstwArticles: {
//             type: new GraphQL.GraphQLList(
//               payload.collections["ustw-articles"].graphQL.type
//             ),
//           },
//           bookmarkKetagalanArticles: {
//             type: new GraphQL.GraphQLList(
//               payload.collections["ketagalan-articles"].graphQL.type
//             ),
//           },
//           submittedTaiwanRecords: {
//             type: new GraphQL.GraphQLList(
//               payload.collections["taiwan-records"].graphQL.type
//             ),
//           },
//           notificationSetting: { type: payload.collections.members.graphQL.type.getFields().notificationSetting.type },
//         },
//       }),
//       resolve: meResolver,
//     },
//   };
// };

export const meQuery = (GraphQL, payload) => {
  return {
    Me: {
      type: payload.collections.members.graphQL.type,
      resolve: meResolver,
    },
  };
};
