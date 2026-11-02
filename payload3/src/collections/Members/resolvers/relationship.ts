import { APIError } from 'payload';
import { isMember } from '../../../access/records';
import { mongoAdapter, mongoID } from '../../../utilities/mongo';

const relationships = {
  bookmarkUstwArticles: 'ustw-articles',
  bookmarkKetagalanArticles: 'ketagalan-articles',
  subscribeBills: 'bills',
  subscribePeoples: 'peoples',
} as const;

export function memberRelationship(field: keyof typeof relationships, remove = false) {
  return async (_obj, { id }, { req }, _info) => {
    if (!isMember(req.user)) throw new APIError('Member authentication required', 401);
    const { payload, user } = req;
    const targetID = mongoID(payload, id);
    await payload.findByID({ collection: relationships[field], id, req, overrideAccess: false, depth: 0 });
    // Scope this exceptional write to one authenticated member and one allowed field.
    // Atomic operators preserve simultaneous additions and compare BSON IDs correctly.
    const result = await mongoAdapter(payload).collections.members.updateOne(
      { _id: mongoID(payload, user.id), providerId: user.providerId },
      remove ? { $pull: { [field]: targetID } } : { $addToSet: { [field]: targetID } },
    );
    if (!result.matchedCount) throw new APIError('Member not found', 404);
    return payload.findByID({ collection: 'members', id: user.id, req, overrideAccess: false, depth: 0 });
  };
}
