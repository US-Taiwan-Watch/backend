export const peoplesFilterResolver = async (obj, args, context) => {
  const { where, sort, limit = 10, page = 1 } = args;

  const {
    experiences__category,
    experiences__positions__congresses,
    experiences__positions__party,
    experiences__positions__state,
    experiences__positions__district,
    experiences__positions__officialAreas,
    experiences__positions__companyType,
    congressionalData__bioGuideId,
    tags,
  } = where || {};

  // Initialize the 'where' clause
  const whereObj = {} as any;

  // Initialize the experiences filter object
  const experienceConditions = {} as any;

  // Add conditions based on provided arguments for experiences.category
  if (isNonEmpty(experiences__category)) {
    experienceConditions.category = { $eq: experiences__category.equals };
  }

  // Initialize the positions filter object
  const positionConditions = {} as any;

  // Add conditions for experiences.positions fields
  if (isNonEmpty(experiences__positions__congresses)) {
    positionConditions.congresses = {
      $in: experiences__positions__congresses.in,
    };
  }
  if (isNonEmpty(experiences__positions__party)) {
    positionConditions.party = {
      $in: experiences__positions__party.in,
    };
  }
  if (isNonEmpty(experiences__positions__state)) {
    positionConditions.state = {
      $in: experiences__positions__state.in,
    };
  }
  if (isNonEmpty(experiences__positions__district)) {
    positionConditions.district = {
      $eq: experiences__positions__district.equals,
    };
  }
  if (isNonEmpty(experiences__positions__officialAreas)) {
    positionConditions.officialAreas = {
      $in: experiences__positions__officialAreas.in,
    };
  }
  if (isNonEmpty(experiences__positions__companyType)) {
    positionConditions.companyType = {
      $in: experiences__positions__companyType.in,
    };
  }

  // Combine experiences and positions filters
  if (Object.keys(positionConditions).length > 0) {
    experienceConditions.positions = { $elemMatch: positionConditions };
  }

  if (Object.keys(experienceConditions).length > 0) {
    whereObj.experiences = { $elemMatch: experienceConditions };
  }

  // Add bioGuideId filter
  if (isNonEmpty(congressionalData__bioGuideId)) {
    whereObj['congressionalData.bioGuideId'] = {
      $in: congressionalData__bioGuideId.in,
    };
  }

  // Add tags filter
  if (isNonEmpty(tags)) {
    whereObj.tags = { $in: tags.in };
  }

  const db = context.req.payload.db;

  // Ensure 'limit' and 'page' are positive integers
  const itemsPerPage = Math.max(parseInt(limit, 10) || 10, 1);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);

  // Calculate the number of documents to skip
  const skipDocuments = (currentPage - 1) * itemsPerPage;

  // Execute the query with pagination
  const result = await db.collections["peoples"]
    .find(whereObj)
    .sort(sort)
    .skip(skipDocuments)
    .limit(itemsPerPage);

  // Retrieve the total count of documents matching the 'where' criteria
  const totalDocs = await db.collections["peoples"].countDocuments(whereObj);

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
