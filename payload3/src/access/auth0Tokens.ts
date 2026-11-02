import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';

export type MemberTokenRealm = { issuer: string; audience: string; jwks: JSONWebKeySet };

export async function verifyMemberToken(token: string, realm: MemberTokenRealm) {
  const { payload: claims } = await jwtVerify(token, createLocalJWKSet(realm.jwks), {
    algorithms: ['RS256'], issuer: realm.issuer, audience: realm.audience,
    requiredClaims: ['sub', 'exp', 'iat'], maxTokenAge: 3600,
  });
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256) throw Error('Invalid subject');
  if (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== realm.audience) throw Error('Invalid authorized party');
  if (claims.azp !== undefined && claims.azp !== realm.audience) throw Error('Invalid authorized party');
  return claims;
}
