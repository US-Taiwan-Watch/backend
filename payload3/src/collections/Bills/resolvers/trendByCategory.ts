import { mongoID } from '../../../utilities/mongo';

export const trendByCategoryResolver = async (obj, args, context, info) => {
  const categoryID = args.category ? mongoID(context.req.payload, args.category) : undefined;
  try {
    const { category } = args;

    const db = context.req.payload.db;
    const pipeline = [];

    if (category) {
      pipeline.push({
        $match: {
          categories: categoryID,
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$congress',
          billCount: { $sum: 1 },
        },
      },
      {
        $project: {
          congress: '$_id',
          billCount: 1,
          _id: 0,
        },
      },
      {
        $sort: { congress: 1 },
      }
    );

    const results = await db.collections['bills'].aggregate(pipeline);

    return results;
  } catch (error) {
    console.error('Error fetching bill trend by category:', error.message);
    throw new Error('Failed to fetch bill trend by category');
  }
}
