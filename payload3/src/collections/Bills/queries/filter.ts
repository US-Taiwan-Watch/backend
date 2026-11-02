import { billsFilterResolver } from "../resolvers/filter";
import { GraphQLJSON } from '@payloadcms/graphql/types';

export const billsFilterQuery = (GraphQL, payload) => {
  return {
    BillsFilter: {
      type: new GraphQL.GraphQLObjectType({
        name: "BillsFilter",
        fields: {
          docs: {
            type: new GraphQL.GraphQLList(
              payload.collections["bills"].graphQL.type
            ),
          },
          hasNextPage: { type: GraphQL.GraphQLBoolean },
          hasPrevPage: { type: GraphQL.GraphQLBoolean },
          limit: { type: GraphQL.GraphQLInt },
          page: { type: GraphQL.GraphQLInt },
          nextPage: { type: GraphQL.GraphQLInt },
          offset: { type: GraphQL.GraphQLInt },
          pagingCounter: { type: GraphQL.GraphQLInt },
          prevPage: { type: GraphQL.GraphQLInt },
          totalDocs: { type: GraphQL.GraphQLInt },
          totalPages: { type: GraphQL.GraphQLInt },
        },
      }),
      args: {
        limit: { type: GraphQL.GraphQLInt },
        page: { type: GraphQL.GraphQLInt },
        sort: { type: GraphQL.GraphQLString },
        where: {
          type: new GraphQL.GraphQLInputObjectType({
            name: "Bill_filter_where",
            fields: {
              sponsor__party: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_sponsor__party_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              type: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_type_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              congress: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_congress_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLInt) },
                  },
                }),
              },
              statusTracker__currentStep: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_statusTracker__currentStep_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              sponsor__people: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_sponsor__people_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQLJSON) },
                  },
                }),
              },
              cosponsors__people: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_cosponsors__people_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQLJSON) },
                  },
                }),
              },
              tags: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_tags_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQLJSON) },
                  },
                }),
              },
              categories: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "Bill_filter_categories_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQLJSON) },
                  },
                }),
              }
            },
          }),
        }
      },
      resolve: billsFilterResolver,
    },
  };
};
