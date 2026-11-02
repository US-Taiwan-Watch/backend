import { APIError } from 'payload';
import { searchGroupedByType, searchTypes } from '../../../services/algolia';

export const searchResolver = async (_obj, args, context) => {
  const searchTerm = args.search ?? '';
  const limit = args.limit ?? 10;
  const page = args.page ?? 1;
  const filter = args.filter;
  if (typeof searchTerm !== 'string' || searchTerm.length > 500 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(page) || page < 1 || (filter && !searchTypes.includes(filter))) {
    throw new APIError('Invalid search parameters.', 400);
  }
  let grouped;
  try {
    grouped = await searchGroupedByType({ searchTerm, limit, page, filter });
  } catch {
    // Never expose provider responses, headers or credentials to callers/logs.
    throw new APIError('Search is temporarily unavailable. Please try again.', 502);
  }
  const req = context.req;
  const definitions = [
    ['people', 'peoples', 'people'],
    ['bill', 'bills', 'bill'],
    ['ustw-article', 'ustw-articles', 'ustwArticle'],
    ['ketagalan-article', 'ketagalan-articles', 'ketagalanArticle'],
  ] as const;
  const results = await Promise.all(definitions.map(async ([type, collection, field]) => {
    const category = grouped.categories[type];
    const docs = category.ids.length ? (await req.payload.find({
      collection, req, overrideAccess: false, depth: 0, pagination: false,
      where: { id: { in: category.ids } },
    })).docs : [];
    const byId = new Map(docs.map(doc => [String(doc.id), doc]));
    const positions = category.ids.map((id, index) => ({ id, index })).filter(({ id }) => byId.has(id));
    return [field, {
      count: grouped.counts[type],
      items: positions.map(({ id }) => byId.get(id)),
      highlights: positions.map(({ index }) => category.highlights[index]),
      snippets: positions.map(({ index }) => category.snippets[index]),
    }];
  }));
  return Object.fromEntries(results);
};
