import { APIError, type Access } from 'payload';

export const relationshipID = (value: any): string => String(value?.id ?? value?._id ?? value ?? '');
export const isMember = (user: any) => user?.collection === 'members' && Boolean(user.id && user.providerId);
export const recordRead: Access = ({ req }) => {
  if (req.user?.collection === 'users') return true;
  if (isMember(req.user)) return { or: [{ status: { equals: 'published' } }, { author: { equals: req.user.id } }] };
  return { status: { equals: 'published' } };
};
export const recordCreate: Access = ({ req }) => req.user?.collection === 'users' || isMember(req.user);
export const recordUpdate: Access = ({ req }) => {
  if (req.user?.collection === 'users') return true;
  if (!isMember(req.user)) return false;
  return { and: [{ author: { equals: req.user.id } }, { status: { in: ['drafted', 'inReview'] } }] };
};

export async function validateRecordInput(req: any, data: any) {
  if (data.people) await req.payload.findByID({ collection: 'peoples', id: relationshipID(data.people), req, overrideAccess: false, depth: 0 });
  for (const item of data.photos || []) {
    const media = await req.payload.findByID({ collection: 'media-taiwan-record', id: relationshipID(item.photo), req, overrideAccess: false, depth: 0 });
    if (isMember(req.user) && relationshipID(media.owner) !== relationshipID(req.user.id)) throw new APIError('Uploaded photos must belong to the submitting member', 403);
  }
}

export async function enforceRecordChange({ data, originalDoc, operation, req }: any) {
  const user = req.user;
  const admin = user?.collection === 'users';
  if (!admin && !isMember(user)) throw new APIError('Authentication required', 401);
  const action = req.context?.taiwanRecordAction;
  if (operation === 'create') {
    if (!admin && data.author && relationshipID(data.author) !== relationshipID(user.id)) throw new APIError('Author is server controlled', 403);
    if (!admin) data.author = user.id;
    if (!data.author) throw new APIError('A member author is required', 400);
    if (data.status && data.status !== 'drafted' && action !== 'submit') throw new APIError('Status is server controlled', 403);
    if (data.versions?.length) throw new APIError('Approval history is server controlled', 403);
    data.status = action === 'submit' ? 'inReview' : 'drafted';
    data.versions = [];
  } else {
    if (!admin && relationshipID(originalDoc.author) !== relationshipID(user.id)) throw new APIError('Record ownership required', 403);
    if (data.author && relationshipID(data.author) !== relationshipID(originalDoc.author)) throw new APIError('Author cannot be changed', 403);
    if (data.status && data.status !== originalDoc.status && !action) throw new APIError('Use the submission or moderation action to change status', 403);
    if (data.versions && JSON.stringify(data.versions) !== JSON.stringify(originalDoc.versions || []) && action !== 'approve') throw new APIError('Approval history is server controlled', 403);
    if (!admin && !['drafted', 'inReview'].includes(originalDoc.status)) throw new APIError('Only pending records can be changed by their author', 403);
  }
  await validateRecordInput(req, data);
  return data;
}

export const taiwanMediaRead: Access = ({ req }) => {
  if (req.user?.collection === 'users') return true;
  const publicWhere = [{ publishedForRecord: { equals: true } }, { owner: { exists: false } }];
  return { or: [...publicWhere, ...(isMember(req.user) ? [{ owner: { equals: req.user.id } }] : [])] };
};
