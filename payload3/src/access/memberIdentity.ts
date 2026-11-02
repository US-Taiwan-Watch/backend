import type { AuthStrategy } from 'payload';
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AUTH0_ISSUER, AUTH0_AUDIENCE } from '../runtime/config';
const jwks = createRemoteJWKSet(new URL('.well-known/jwks.json', AUTH0_ISSUER), { timeoutDuration: 5000, cooldownDuration: 30000 });
export const memberStrategy: AuthStrategy = {
  name: 'auth0-member',
  authenticate: async ({ headers, payload }) => {
    const authorization = headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return { user: null };
    try {
      const { payload: claims } = await jwtVerify(authorization.slice(7), jwks, {
        algorithms: ['RS256'], issuer: AUTH0_ISSUER, audience: AUTH0_AUDIENCE,
        requiredClaims: ['sub','exp','iat'], maxTokenAge: 86400,
      });
      if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256 || (claims.azp !== undefined && claims.azp !== AUTH0_AUDIENCE) || (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== AUTH0_AUDIENCE)) return { user: null };
      const find = async () => (await payload.find({ collection: 'members', where: { providerId: { equals: claims.sub } }, limit: 1, depth: 0, overrideAccess: true })).docs[0];
      let member = await find();
      if (!member) {
        if (claims.email_verified !== true || typeof claims.email !== 'string' || claims.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) return { user: null };
        const adapter = payload.db as any;
        const _id = new adapter.connection.base.Types.ObjectId(crypto.createHash('sha256').update(AUTH0_ISSUER + '\0' + claims.sub).digest('hex').slice(0,24));
        const now = new Date();
        try {
          await adapter.collections.members.collection.updateOne({ provider: 'auth0', providerId: claims.sub }, { $setOnInsert: {
            _id, provider: 'auth0', providerId: claims.sub, email: claims.email,
            fullName: String(claims.name || claims.nickname || claims.email.split('@')[0]).slice(0,200),
            subscribeBills: [], subscribePeoples: [], bookmarkUstwArticles: [], bookmarkKetagalanArticles: [], submittedTaiwanRecords: [],
            notificationSetting: { billRelease: false, ustwArticleRelease: false, ketagalanArticleRelease: false, podcastRelease: false }, createdAt: now, updatedAt: now,
          } }, { upsert: true });
        } catch (error) { if (error.code !== 11000) throw error; }
        member = await find();
      }
      if (!member || member.provider !== 'auth0') return { user: null };
      return { user: { ...member, collection: 'members', _strategy: 'auth0-member' } as any };
    } catch { return { user: null }; }
  },
};
