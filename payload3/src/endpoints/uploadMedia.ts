import path from 'node:path';
import crypto from 'node:crypto';
import { APIError, type PayloadHandler, type PayloadRequest } from 'payload';
import { isMember } from '../access/records';

const maxBody = 6 * 1024 * 1024;
const maxFile = 2 * 1024 * 1024;
async function boundedBody(req: PayloadRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new APIError('Multipart body required', 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBody) { await reader.cancel(); throw new APIError('Upload too large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks));
}

function imageSignature(data: Buffer, mime: string) {
  if (mime === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (mime === 'image/gif') return /^GIF8[79]a/.test(data.subarray(0, 6).toString());
  if (mime === 'image/webp') return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  return false;
}

export const uploadTaiwanMedia: PayloadHandler = async req => {
  if (req.user?.collection !== 'users' && !isMember(req.user)) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const created: string[] = [];
  try {
    if (!req.headers.get('content-type')?.startsWith('multipart/form-data')) throw new APIError('Multipart upload required', 400);
    if (Number(req.headers.get('content-length') || 0) > maxBody) throw new APIError('Upload too large', 413);
    const body = await boundedBody(req);
    const form = await new Request(req.url, { method: 'POST', headers: { 'content-type': req.headers.get('content-type') }, body }).formData();
    const files = form.getAll('files');
    if (!files.length || files.length > 4 || !files.every(item => item instanceof File)) throw new APIError('Upload between one and four image files', 400);
    const prepared = await Promise.all((files as File[]).map(async file => {
      if (!file.size || file.size > maxFile) throw new APIError('Image exceeds file size limit', 413);
      const data = Buffer.from(await file.arrayBuffer());
      if (!imageSignature(data, file.type)) throw new APIError('Only valid PNG, JPEG, GIF and WebP images are accepted', 415);
      return { data, name: `${crypto.randomUUID()}-${path.basename(file.name).replace(/[^\w.-]/g, '_')}`, mimetype: file.type, size: file.size };
    }));
    const alts = form.getAll('alts');
    const docs = [];
    for (let i = 0; i < prepared.length; i++) {
      const doc = await req.payload.create({ collection: 'media-taiwan-record', data: { alt: String(alts[i] || 'Rehearsal upload').slice(0, 500) }, file: prepared[i], req, user: req.user, overrideAccess: false, depth: 0 });
      created.push(String(doc.id)); docs.push(doc);
    }
    return Response.json({ message: 'Media - Taiwan Record successfully created.', docs }, { status: 201 });
  } catch (error) {
    // Compensate partial batches without touching unrelated assets.
    for (const id of created) await req.payload.delete({ collection: 'media-taiwan-record', id, req, overrideAccess: true }).catch(() => undefined);
    const status = error instanceof APIError ? error.status : 400;
    return Response.json({ error: status === 400 ? 'File upload failed' : error.message }, { status });
  }
};
