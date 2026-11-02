import { peoplesFilterResolver } from "../resolvers/filter";
import { GraphQLJSON } from '@payloadcms/graphql/types';

export const peoplesFilterQuery = (GraphQL, payload) => {
  return {
    PeoplesFilter: {
      type: new GraphQL.GraphQLObjectType({
        name: "PeoplesFilter",
        fields: {
          docs: {
            type: new GraphQL.GraphQLList(
              payload.collections["peoples"].graphQL.type
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
            name: "People_filter_where",
            fields: {
              experiences__category: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__category_operator",
                  fields: {
                    equals: { type: GraphQL.GraphQLString },
                  },
                }),
              },
              experiences__positions__congresses: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__congresses_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLInt) },
                  },
                }),
              },
              experiences__positions__party: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__party_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              experiences__positions__state: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__state_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              experiences__positions__district: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__district_operator",
                  fields: {
                    equals: { type: GraphQL.GraphQLInt },
                  },
                }),
              },
              experiences__positions__officialAreas: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__officialAreas_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              experiences__positions__companyType: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_experiences__positions__companyType_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              },
              tags: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_tags_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQLJSON) },
                  },
                }),
              },
              congressionalData__bioGuideId: {
                type: new GraphQL.GraphQLInputObjectType({
                  name: "People_filter_congressionalData__bioGuideId_operator",
                  fields: {
                    in: { type: new GraphQL.GraphQLList(GraphQL.GraphQLString) },
                  },
                }),
              }
            },
          }),
        }
      },
      resolve: peoplesFilterResolver,
    },
  };
};
