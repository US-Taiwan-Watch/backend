import { APIError, createLocalReq, type PayloadHandler } from 'payload';
import { relationshipID } from '../../access/records';

export const moderateRecord = (action: 'approve' | 'reject' | 'unpublish'): PayloadHandler => async req => {
  if (req.user?.collection !== 'users') return Response.json({ error: 'CMS administrator required' }, { status: 403 });
  const id = String(req.routeParams?.id || '');
  if (!/^[a-f\d]{24}$/i.test(id)) return Response.json({ error: 'Invalid record ID' }, { status: 400 });
  let transactionID: string | number | null;
  try {
    transactionID = await req.payload.db.beginTransaction();
    if (!transactionID) throw new APIError('Moderation requires a database transaction', 503);
    const txReq = await createLocalReq({ req: { transactionID }, user: req.user, context: req.context }, req.payload);
    const record = await req.payload.findByID({ collection: 'taiwan-records', id, req: txReq, overrideAccess: false, depth: 0 });
    const expected = action === 'unpublish' ? 'published' : 'inReview';
    if (record.status !== expected) throw new APIError('Invalid moderation transition', 409);
    const status = action === 'approve' ? 'published' : 'drafted';
    const { versions = [], ...snapshot } = record;
    const data: any = { status };
    if (action === 'approve') data.versions = [...versions, { version: versions.length + 1, data: { ...snapshot, status }, approvedAt: new Date().toISOString() }];
    const updated = await req.payload.update({ collection: 'taiwan-records', id, data, req: txReq, overrideAccess: false, context: { ...req.context, taiwanRecordAction: action }, depth: 0 });
    for (const item of record.photos || []) {
      const mediaID = relationshipID(item.photo);
      const published = await req.payload.count({ collection: 'taiwan-records', where: { and: [{ status: { equals: 'published' } }, { 'photos.photo': { equals: mediaID } }] }, req: txReq, overrideAccess: true });
      // The handler has already established a CMS administrator. Only this
      // derived visibility flag bypasses field access; no client data is passed.
      await req.payload.update({ collection: 'media-taiwan-record', id: mediaID, data: { publishedForRecord: published.totalDocs > 0 }, req: txReq, overrideAccess: true });
    }
    await req.payload.db.commitTransaction(transactionID);
    transactionID = null;
    return Response.json(updated);
  } catch (error) {
    if (transactionID) await req.payload.db.rollbackTransaction(transactionID);
    const status = error instanceof APIError ? error.status : (error.code === 112 || error.hasErrorLabel?.('TransientTransactionError')) ? 409 : 500;
    return Response.json({ error: status === 500 ? 'Moderation failed' : error.message }, { status });
  }
};
