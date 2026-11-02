import fs from 'node:fs';
import { spawn } from 'node:child_process';
// The final image never inherits the build-only flag or test credentials.
if (process.env.USTW_BUILD_ONLY || Object.keys(process.env).some(k => /^(?:USTW_REAL_|USTW_PAYLOAD3_REHEARSAL|USTW_AZURE_STORAGE_TEST)/.test(k) && process.env[k])) throw Error('Build/rehearsal flags cannot start the production server');
for (const name of ['CMS_SERVER_ORIGIN','DATABASE_URI','MONGODB_TLS_CA_FILE','PAYLOAD_SECRET','AZURE_STORAGE_CONNECTION_STRING','ALGOLIA_APP_ID','ALGOLIA_INDEX_NAME','ALGOLIA_WRITE_KEY','ALGOLIA_SEARCH_KEY','AUTH0_MGMT_CLIENT_ID','AUTH0_MGMT_CLIENT_SECRET','SOUNDON_API_TOKEN']) {
  if (!process.env[name]) throw Error(`Missing production setting: ${name}`);
}
if (!fs.existsSync(process.env.MONGODB_TLS_CA_FILE)) throw Error('Database trust file is unavailable');
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT ||= '3080';
const secretNames = new Set(['DATABASE_URI','AZURE_STORAGE_CONNECTION_STRING', ...Object.keys(process.env).filter(name => /(?:_SECRET|_PASSWORD|_KEY|_TOKEN)$/.test(name))]);
const secrets = [...secretNames].map(name => process.env[name]).filter(Boolean);
const database = new URL(process.env.DATABASE_URI);
if (database.password) secrets.push(database.password, decodeURIComponent(database.password));
for (const item of process.env.AZURE_STORAGE_CONNECTION_STRING.split(';')) {
  const i = item.indexOf('=');
  if (['AccountKey','SharedAccessSignature'].includes(item.slice(0,i))) {
    const value = item.slice(i+1); secrets.push(value);
    if (item.startsWith('SharedAccessSignature=')) { const sig = new URLSearchParams(value).get('sig'); if (sig) secrets.push(sig,encodeURIComponent(sig)); }
  }
}
const child = spawn(process.execPath, ['/app/server.js'], { env: process.env, stdio: ['inherit','pipe','pipe'] });
for (const [stream,destination] of [[child.stdout,process.stdout],[child.stderr,process.stderr]]) {
  let pending = '';
  const redact = text => secrets.reduce((value,secret) => secret ? value.split(secret).join('[REDACTED]') : value, text);
  stream.on('data',part => { pending += part.toString(); let end; while ((end=pending.indexOf('\n'))!==-1) { destination.write(redact(pending.slice(0,end+1))); pending=pending.slice(end+1); } });
  stream.on('end',() => { if(pending)destination.write(redact(pending)); });
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{ console.error('Production server failed to start'); process.exit(1); });
child.on('exit',code=>process.exit(code??1));
