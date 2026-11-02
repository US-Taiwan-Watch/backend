import type { PayloadHandler } from 'payload';

// Preserve route names while preventing live ingestion for this release.
export const withHeaderSecret = (_handler: unknown): PayloadHandler => async req => {
  if (req.user?.collection !== 'users') return Response.json({ error: 'CMS administrator required' }, { status: 403 });
  return Response.json({ error: 'External ingestion is disabled for this release' }, { status: 503 });
};
