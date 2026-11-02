import { APIError } from 'payload';
import { AUTH0_ISSUER, required } from '../runtime/config';
let cached: { token: string; until: number } | undefined;
let pending: Promise<string> | undefined;
async function token() {
  if (cached && cached.until > Date.now()) return cached.token;
  if (!pending) pending = (async () => {
    const response = await fetch(new URL('oauth/token', AUTH0_ISSUER), {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: required('AUTH0_MGMT_CLIENT_ID'), client_secret: required('AUTH0_MGMT_CLIENT_SECRET'), audience: `${AUTH0_ISSUER}api/v2/` }),
    });
    if (!response.ok) throw Error('Identity service unavailable');
    const data = await response.json();
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in < 60) throw Error('Identity service unavailable');
    cached = { token: data.access_token, until: Date.now() + (Math.min(data.expires_in,3600)-30)*1000 };
    return cached.token;
  })().finally(() => { pending = undefined; });
  return pending;
}
export const assertIsDatabaseUser = (sub: string) => { if (!sub.startsWith('auth0|')) throw Error('This identity is not a database user.'); };
async function change(id: string, method: 'PATCH' | 'DELETE', data?: Record<string,unknown>) {
  if (typeof id !== 'string' || !id.includes('|') || id.length > 256 || /[\x00-\x1f\x7f]/.test(id)) throw Error('Invalid identity');
  try {
    const response = await fetch(`${AUTH0_ISSUER}api/v2/users/${encodeURIComponent(id)}`, {
      method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw Error('Rejected');
    return {};
  } catch { throw new APIError('Identity service is temporarily unavailable. The requested account change was not completed.',502); }
}
export const getAuth0Management = () => ({ users: {
  update: async (id: string, data: Record<string,unknown>) => {
    assertIsDatabaseUser(id);
    if (Object.keys(data).some(key => !['email','email_verified','verify_email','password'].includes(key))) throw Error('Unsupported identity update');
    return change(id,'PATCH',data);
  },
  delete: async (id: string) => change(id,'DELETE'),
} });
