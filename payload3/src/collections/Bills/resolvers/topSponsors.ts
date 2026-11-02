import { statisticsLimit } from '../../../utilities/mongo';

const addCurrentParty = (doc) => {
  if (!doc?.experiences || !Array.isArray(doc.experiences)) return doc;

  const now = new Date();
  let currentParty = null;

  const isCurrentPosition = (position) => {
    if (!position?.party) return false;

    const endValue = position?.end?.datetime ?? position?.end;
    if (!endValue) return true;

    const endDate = new Date(endValue);
    if (Number.isNaN(endDate.getTime())) return false;

    return endDate > now;
  };

  doc.experiences.forEach((experience) => {
    if (!experience?.positions || !Array.isArray(experience.positions)) return;

    experience.positions.forEach((position) => {
      if (isCurrentPosition(position)) {
        currentParty = position.party; // 目前會以「最後一個符合條件的」為準
      }
    });
  });

  doc.currentParty = currentParty ?? "independent";
  return doc;
};

export const topSponsorsResolver = async (obj, args, context, info) => {
  const limit = statisticsLimit(args.limit, 5);
  try {
    const db = context.req.payload.db;
    let results = await db.collections['bills'].aggregate([
      {
        $group: {
          _id: '$sponsor.people', // Access the sponsorId inside the sponsor object
          billCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          sponsorId: { $toObjectId: '$_id' }, // Convert sponsorId (if string) to ObjectId
        },
      },
      {
        $lookup: {
          from: 'peoples',
          localField: 'sponsorId',
          foreignField: '_id',
          as: 'sponsorInfo',
        },
      },
      {
        $unwind: '$sponsorInfo',
      },
      {
        $project: {
          _id: 0,
          // name: '$sponsorInfo.fullName',
          people: {
            $mergeObjects: [
              { id: { $toString: "$sponsorInfo._id" } },
              "$sponsorInfo",
            ],
          },
          billCount: 1,
        },
      },
      {
        $sort: { billCount: -1 },
      },
      {
        $limit: limit
      },
    ]);

    results = results.map(result => ({ ...result, people: addCurrentParty(result.people) }))

    return results;
  } catch (error) {
    console.error('Error fetching top sponsors:', error.message);
    throw new Error('Failed to fetch top sponsors');
  }
}

export const topCosponsorsResolver = async (obj, args, context, info) => {
  const limit = statisticsLimit(args.limit, 5);
  try {
    const db = context.req.payload.db;
    let results = await db.collections['bills'].aggregate([
      {
        $unwind: '$cosponsors', // Unwind the cosponsors array
      },
      {
        $group: {
          _id: '$cosponsors.people', // Group by the sponsorId within each cosponsor object
          billCount: { $sum: 1 },       // Count the number of bills each cosponsor has
        },
      },
      {
        $addFields: {
          cosponsorId: { $toObjectId: '$_id' }, // Convert cosponsorId to ObjectId
        },
      },
      {
        $lookup: {
          from: 'peoples',
          localField: 'cosponsorId',
          foreignField: '_id',
          as: 'cosponsorInfo',
        },
      },
      {
        $unwind: '$cosponsorInfo', // Unwind cosponsor info
      },
      {
        $project: {
          _id: 0,
          // name: '$cosponsorInfo.fullName', // Get full name of the cosponsor
          people: {
            $mergeObjects: [
              { id: { $toString: "$cosponsorInfo._id" } },
              "$cosponsorInfo",
            ],
          },
          billCount: 1, // Include the bill count
        },
      },
      {
        $sort: { billCount: -1 }, // Sort by bill count in descending order
      },
      {
        $limit: limit // Limit to top cosponsors
      },
    ]);

    results = results.map(result => ({ ...result, people: addCurrentParty(result.people) }))

    return results;
  } catch (error) {
    console.error('Error fetching top cosponsors:', error.message);
    throw new Error('Failed to fetch top cosponsors');
  }
}
