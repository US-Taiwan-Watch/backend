import { mongoID, statisticsLimit } from '../../../utilities/mongo';

export const topTagsResolver = async (obj, args, context, info) => {
  const limit = statisticsLimit(args.limit, 10);
  try {
    const db = context.req.payload.db;

    const usedTags = await db.collections["bills"].aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          billCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          tagId: { $toObjectId: "$_id" },
        },
      },
      {
        $lookup: {
          from: "tags",
          localField: "tagId",
          foreignField: "_id",
          as: "tagInfo",
        },
      },
      { $unwind: "$tagInfo" },
      {
        $project: {
          _id: 0,
          billCount: 1,
          tag: {
            $mergeObjects: [
              { id: { $toString: "$tagInfo._id" } },
              "$tagInfo",
            ],
          },
        },
      },
      { $sort: { billCount: -1 } },
      { $limit: limit },
    ]);

    if (usedTags.length >= limit) {
      return usedTags;
    }

    const usedTagIds = usedTags.map((item) => mongoID(context.req.payload, item.tag.id));
    const needed = limit - usedTags.length;

    const randomUnused = await db.collections["tags"].aggregate([
      { $match: { _id: { $nin: usedTagIds } } },
      { $sample: { size: needed } },
      {
        $project: {
          _id: 0,
          billCount: { $literal: 0 },
          tag: {
            $mergeObjects: [
              { id: { $toString: "$_id" } },
              "$$ROOT", // Or pick only the fields you need
            ],
          },
        },
      },
    ]);

    const finalResults = [...usedTags, ...randomUnused];

    return finalResults.slice(0, limit);
  } catch (error) {
    console.error("Error fetching top tags:", error.message);
    throw new Error("Failed to fetch top tags");
  }
};
