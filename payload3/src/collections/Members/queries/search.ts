import { searchResolver } from "../resolvers/search";
import { GraphQLJSON } from '@payloadcms/graphql/types';

export const searchQuery = (GraphQL, payload) => {
  const searchFilterEnum = new GraphQL.GraphQLEnumType({
    name: 'SearchFilterEnum',
    values: {
      PEOPLE: { value: 'people' },
      BILL: { value: 'bill' },
      USTW_ARTICLE: { value: 'ustw-article' },
      KETAGALAN_ARTICLE: { value: 'ketagalan-article' },
    },
  });

  const makeCategoryType = (name, itemGraphQLType) =>
    new GraphQL.GraphQLObjectType({
      name,
      fields: {
        count: { type: GraphQL.GraphQLInt },
        items: { type: new GraphQL.GraphQLList(itemGraphQLType) },
        highlights: { type: GraphQLJSON },
        snippets: { type: GraphQLJSON },
      },
    });

  return {
    Search: {
      type: new GraphQL.GraphQLObjectType({
        name: 'Search',
        fields: {
          people: {
            type: makeCategoryType(
              'PeopleSearchResult',
              payload.collections['peoples'].graphQL.type
            ),
          },
          bill: {
            type: makeCategoryType(
              'BillSearchResult',
              payload.collections['bills'].graphQL.type
            ),
          },
          ustwArticle: {
            type: makeCategoryType(
              'UstwArticleSearchResult',
              payload.collections['ustw-articles'].graphQL.type
            ),
          },
          ketagalanArticle: {
            type: makeCategoryType(
              'KetagalanArticleSearchResult',
              payload.collections['ketagalan-articles'].graphQL.type
            ),
          },
        },
      }),
      args: {
        search: { type: GraphQL.GraphQLString },
        page: { type: GraphQL.GraphQLInt },
        limit: { type: GraphQL.GraphQLInt },
        filter: { type: searchFilterEnum },
      },
      resolve: searchResolver,
    },
  };
};
