import { APIError } from 'payload';
import { mongoAdapter, mongoID } from '../../../utilities/mongo';

export const addViewCountPeopleMutation = (GraphQL, _payload) => ({
  AddViewCountPeopleMutation: {
    type: GraphQL.GraphQLInt,
    args: { id: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) } },
    resolve: async (_, { id }, { req }) => {
      const _id = mongoID(req.payload, id);
      await req.payload.findByID({ collection: 'peoples', id, req, overrideAccess: false, depth: 0 });
      const model = mongoAdapter(req.payload).collections.peoples;
      // Historical documents can lack a counter. Initialize only that case.
      await model.updateOne({ _id, viewCount: null }, { $set: { viewCount: 0 } }, { timestamps: false });
      // Public access grants this increment alone, without editorial hooks or writes.
      const updated = await model.findOneAndUpdate({ _id }, { $inc: { viewCount: 1 } }, { new: true, timestamps: false });
      if (!updated) throw new APIError('People not found', 404);
      return updated.viewCount;
    },
  },
});
