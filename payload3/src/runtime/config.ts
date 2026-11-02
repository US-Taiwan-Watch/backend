import fs from 'node:fs';
export const CMS_ORIGIN = 'https://ustw-cms-backend-hbd9avfxadfneybh.westus2-01.azurewebsites.net';
export const WEB_ORIGINS = ['https://ustw.watch', 'https://www.ustw.watch', 'https://dev.ustw.watch'];
export const AUTH0_ISSUER = 'https://us-taiwan-watch.us.auth0.com/';
export const AUTH0_AUDIENCE = 'O3vW6Bh14A7OuGDdI5qK38l3kn9Vr1LT';
export const STORAGE_ORIGIN = 'https://ustwcmsstorage.blob.core.windows.net';
export const MEDIA_CONTAINERS = {
  'media-article': 'AZURE_STORAGE_CONTAINER_NAME_ARTICLE',
  'media-ketagalan': 'AZURE_STORAGE_CONTAINER_NAME_KETAGALAN',
  'media-people': 'AZURE_STORAGE_CONTAINER_NAME_PEOPLE',
  'media-project': 'AZURE_STORAGE_CONTAINER_NAME_PROJECT',
  'media-member': 'AZURE_STORAGE_CONTAINER_NAME_MEMBER',
  'media-taiwan-record': 'AZURE_STORAGE_CONTAINER_NAME_TAIWAN_RECORD',
} as const;
export function buildOnly() { return process.env.USTW_BUILD_ONLY === '1'; }
export function required(name: string) {
  const value = process.env[name];
  if (!value || /^(?:not-configured|disabled|placeholder|local-build-placeholder)$/.test(value)) throw Error(`Required production setting is missing: ${name}`);
  return value;
}
export function productionConfig() {
  if (buildOnly()) return {
    databaseURI: 'mongodb://build.invalid/ustw-cms', caFile: undefined,
    payloadSecret: 'non-secret-build-placeholder-not-used-at-runtime',
    storageConnection: `DefaultEndpointsProtocol=https;AccountName=ustwcmsstorage;AccountKey=${Buffer.alloc(32).toString('base64')};EndpointSuffix=core.windows.net`,
    containers: Object.fromEntries(Object.keys(MEDIA_CONTAINERS).map(slug => [slug, `build-${slug}`])),
  };
  for (const name of Object.keys(process.env)) {
    if ((name.startsWith('USTW_REAL_') || name.startsWith('USTW_PAYLOAD3_REHEARSAL') || name.startsWith('USTW_AZURE_STORAGE_TEST')) && process.env[name]) throw Error('Rehearsal flags cannot be used in the production release');
  }
  if (required('CMS_SERVER_ORIGIN') !== CMS_ORIGIN) throw Error('Unexpected production CMS origin');
  const databaseURI = required('DATABASE_URI'), uri = new URL(databaseURI);
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '45-61-62-229.us-se-cloud-xip.com' || uri.pathname !== '/ustw-cms' || !uri.username || !uri.password || /^(?:root|admin|payload3-rehearsal-)/i.test(decodeURIComponent(uri.username)) || uri.searchParams.get('replicaSet') !== 'ustw-rs0' || uri.searchParams.get('tls') !== 'true' || ['tlsInsecure','tlsAllowInvalidCertificates','tlsAllowInvalidHostnames','directConnection'].some(k => uri.searchParams.has(k))) throw Error('Production database requires the approved authenticated replica set and validated TLS');
  const caFile = required('MONGODB_TLS_CA_FILE');
  if (!caFile.startsWith('/') || !fs.existsSync(caFile)) throw Error('Production database CA file is unavailable');
  const payloadSecret = required('PAYLOAD_SECRET');
  if (payloadSecret.length < 32) throw Error('Production Payload secret must be at least 32 characters');
  const storageConnection = required('AZURE_STORAGE_CONNECTION_STRING');
  const parts = Object.fromEntries(storageConnection.split(';').filter(Boolean).map(x => { const i = x.indexOf('='); return [x.slice(0,i),x.slice(i+1)]; }));
  if (parts.DefaultEndpointsProtocol === 'http' || (parts.EndpointSuffix && parts.EndpointSuffix !== 'core.windows.net') || (parts.AccountName && parts.AccountName !== 'ustwcmsstorage') || (parts.BlobEndpoint && parts.BlobEndpoint.replace(/\/$/,'') !== STORAGE_ORIGIN) || (!parts.AccountKey && !parts.SharedAccessSignature) || (!parts.AccountName && !parts.BlobEndpoint)) throw Error('Unexpected production storage destination');
  if (process.env.AZURE_STORAGE_ALLOW_CONTAINER_CREATE === 'true') throw Error('Automatic container creation is disabled');
  const containers = Object.fromEntries(Object.entries(MEDIA_CONTAINERS).map(([slug,name]) => {
    const value = required(name);
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value) || value.includes('test') || value.includes('rehearsal')) throw Error(`Invalid production container binding: ${name}`);
    return [slug,value];
  }));
  if (required('ALGOLIA_APP_ID') !== '3DWAKUFOR9' || required('ALGOLIA_INDEX_NAME') !== 'ustw-website') throw Error('Unexpected production search destination');
  for (const name of ['ALGOLIA_WRITE_KEY','ALGOLIA_SEARCH_KEY','AUTH0_MGMT_CLIENT_ID','AUTH0_MGMT_CLIENT_SECRET','SOUNDON_API_TOKEN']) required(name);
  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_DOMAIN !== 'us-taiwan-watch.us.auth0.com') throw Error('Unexpected Auth0 tenant');
  return { databaseURI, caFile, payloadSecret, storageConnection, containers };
}
