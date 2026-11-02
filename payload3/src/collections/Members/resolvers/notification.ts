import { APIError } from 'payload';
import { isMember } from '../../../access/records';
import { mongoAdapter, mongoID } from '../../../utilities/mongo';

const preferenceFields = new Set([
  'billRelease', 'ustwArticleRelease', 'ketagalanArticleRelease',
  'podcastRelease', 'subscribedBillUpdate', 'subscribedPeopleUpdate', 'newsletter',
]);

export const updateNotificationSettingResolver = async (_obj, args, { req }, _info) => {
  if (!isMember(req.user)) throw new APIError('Member authentication required', 401);
  const preferences = args.notificationSetting ?? {};
  if (typeof preferences !== 'object' || Array.isArray(preferences)) throw new APIError('Invalid notification settings', 400);
  const updates: Record<string, boolean> = {};
  for (const [field, value] of Object.entries(preferences)) {
    if (!preferenceFields.has(field) || (value != null && typeof value !== 'boolean')) {
      throw new APIError('Notification settings must be known boolean preferences', 400);
    }
    // Null/omitted values retain the current setting; explicit false is a change.
    if (value != null) updates[`notificationSetting.${field}`] = value as boolean;
  }
  const filter = { _id: mongoID(req.payload, req.user.id), providerId: req.user.providerId };
  const model = mongoAdapter(req.payload).collections.members;
  if (Object.keys(updates).length) {
    // Update only supplied paths, so simultaneous independent choices do not collide.
    const result = await model.updateOne(filter, { $set: updates });
    if (!result.matchedCount) throw new APIError('Member not found', 404);
  } else if (!(await model.exists(filter))) throw new APIError('Member not found', 404);
  return req.payload.findByID({ collection: 'members', id: req.user.id, req, overrideAccess: false, depth: 0 });
};
