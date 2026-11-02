export const billsFilterResolver = async (obj, args, context) => {
  const { where, sort, limit = 10, page = 1 } = args;

  const {
    sponsor__party,
    type,
    congress,
    statusTracker__currentStep,
    sponsor__people,
    cosponsors__people,
    tags,
    categories,
  } = where || {};

  // Initialize the 'where' clause
  const whereObj = {} as any;

  // Add conditions
  if (isNonEmpty(sponsor__party)) {
    whereObj['sponsor.party'] = { $in: sponsor__party.in };
  }
  if (isNonEmpty(type)) {
    whereObj.type = { $in: type.in };
  }
  if (isNonEmpty(congress)) {
    whereObj.congress = { $in: congress.in };
  }
  if (isNonEmpty(statusTracker__currentStep)) {
    whereObj['statusTracker.currentStep'] = { $in: statusTracker__currentStep.in };
  }
  if (isNonEmpty(sponsor__people)) {
    whereObj['sponsor.people'] = { $in: sponsor__people.in };
  }
  if (isNonEmpty(cosponsors__people)) {
    whereObj.cosponsors = { $elemMatch: { people: { $in: cosponsors__people.in } } };
  }

  if (isNonEmpty(tags)) {
    whereObj.tags = { $in: tags.in };
  }
  if (isNonEmpty(categories)) {
    whereObj.categories = { $in: categories.in };
  }

  const db = context.req.payload.db;

  // Ensure 'limit' and 'page' are positive integers
  const itemsPerPage = Math.max(parseInt(limit, 10) || 10, 1);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);

  // Calculate the number of documents to skip
  const skipDocuments = (currentPage - 1) * itemsPerPage;

  // Execute the query with pagination
  const result = await db.collections["bills"]
    .find(whereObj)
    .sort(sort)
    .skip(skipDocuments)
    .limit(itemsPerPage);

  // Retrieve the total count of documents matching the 'where' criteria
  const totalDocs = await db.collections["bills"].countDocuments(whereObj);

  // Calculate total pages
  const totalPages = Math.ceil(totalDocs / itemsPerPage);

  // Determine if there are previous and next pages
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  // Calculate the paging counter (the starting document number on the current page)
  const pagingCounter = skipDocuments + 1;

  // Determine previous and next page numbers
  const prevPage = hasPrevPage ? currentPage - 1 : null;
  const nextPage = hasNextPage ? currentPage + 1 : null;

  return {
    docs: result,
    hasNextPage,
    hasPrevPage,
    limit: itemsPerPage,
    page: currentPage,
    nextPage,
    offset: skipDocuments,
    pagingCounter,
    prevPage,
    totalDocs,
    totalPages,
  };
};

const isNonEmpty = (obj) => {
  return Object.keys(obj || {}).length > 0;
}
