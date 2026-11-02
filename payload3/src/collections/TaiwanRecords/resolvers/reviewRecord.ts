import { APIError } from 'payload';
import { isMember, relationshipID } from '../../../access/records';
const memberRequest = (context: any) => {
 const req = context.req;
 if (!isMember(req.user)) throw new APIError('Authenticated member required', 401);
 return req;
};
const editableData = (data: any) => Object.fromEntries(['title','description','people','photos','sources'].filter(key => data[key] !== undefined).map(key => [key, data[key]]));
export const submitTaiwanRecordResolver = async (_obj: any, args: any, context: any) => {
 const req = memberRequest(context);
 return req.payload.create({ collection: 'taiwan-records', data: editableData(args.data), req, overrideAccess: false, depth: 0, context: { ...req.context, taiwanRecordAction: 'submit' } });
};
export const modifyTaiwanRecordResolver = async (_obj: any, args: any, context: any) => {
 const req = memberRequest(context);
 const existing = await req.payload.findByID({ collection: 'taiwan-records', id: args.id, req, overrideAccess: false, depth: 0 });
 if (relationshipID(existing.author) !== relationshipID(req.user.id)) throw new APIError('Record ownership required', 403);
 return req.payload.update({ collection: 'taiwan-records', id: args.id, data: { ...editableData(args.data), status: args.resubmitForReview ? 'inReview' : 'drafted' }, req, overrideAccess: false, depth: 0, context: { ...req.context, taiwanRecordAction: 'modify' } });
};
export const withdrawTaiwanRecordResolver = async (_obj: any, args: any, context: any) => {
 const req = memberRequest(context);
 const existing = await req.payload.findByID({ collection: 'taiwan-records', id: args.id, req, overrideAccess: false, depth: 0 });
 if (relationshipID(existing.author) !== relationshipID(req.user.id)) throw new APIError('Record ownership required', 403);
 return req.payload.update({ collection: 'taiwan-records', id: args.id, data: { status: 'deleted' }, req, overrideAccess: false, depth: 0, context: { ...req.context, taiwanRecordAction: 'withdraw' } });
};
