import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {readFile, mkdir, writeFile, rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const requiredChecks = ['serviceActive','certificateValidBeyond30Days','diskBelow85Percent','recentFullBackup','backupChecksum','primary','tlsRequired','approvedBindAddresses','authorization','backendOnlyMongoFirewall','certificatePurpose_sslserver','certificatePurpose_sslclient'];
export function validHeartbeat(value, now = Date.now()) {
  return value && Number.isInteger(value.checkedAtEpoch) && value.checkedAtEpoch * 1000 > now - 600000 && value.checkedAtEpoch * 1000 <= now + 60000 && typeof value.passed === 'boolean' && requiredChecks.every(k => typeof value.checks?.[k] === 'boolean');
}
export function databaseHealthy(value, now = Date.now()) {
  return Boolean(validHeartbeat(value, now) && value.passed && requiredChecks.every(k => value.checks[k]));
}
export function authenticated(header, token) {
  const expected = Buffer.from(`Bearer ${token}`), actual = Buffer.from(header || '');
  return token.length >= 32 && expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function checkUrl(url, fetcher = fetch) {
  try {
    if (new URL(url).protocol !== 'https:') return false;
    const response = await fetcher(url, {redirect:'error', signal:AbortSignal.timeout(15000)});
    if (!response.ok) { await response.body?.cancel(); return false; }
    if (new URL(url).pathname === '/api/health') {
      const value = await response.json();
      return value.status === 'ok';
    }
    await response.body?.cancel();
    return true;
  } catch { return false; }
}

export async function start(env = process.env) {
  const token = env.HEARTBEAT_TOKEN || '';
  if (token.length < 32) throw new Error('Monitoring authentication is not configured');
  const statePath = env.STATE_PATH || '/home/data/ustw-monitor/heartbeat.json';
  const startedAt = Date.now();
  let heartbeat = null, websitesHealthy = false, websitesCheckedAt = 0, ticking = false;
  try { heartbeat = JSON.parse(await readFile(statePath, 'utf8')); } catch {}
  const healthy = () => databaseHealthy(heartbeat) && websitesHealthy && Date.now() - websitesCheckedAt < 300000;
  const server = http.createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json');
    const reply = (code, body) => {res.writeHead(code);res.end(JSON.stringify(body));};
    if (req.method === 'GET' && req.url === '/ready') return reply(200,{status:'ready'});
    if (req.method === 'GET' && req.url === '/probe') return reply(healthy() ? 200 : 503, {status:healthy() ? 'healthy' : 'unhealthy'});
    if (req.method !== 'POST' || req.url !== '/heartbeat') return reply(404,{status:'unknown'});
    if (!authenticated(req.headers.authorization,token)) return reply(401,{status:'unauthorized'});
    try {
      let data = '';
      for await (const chunk of req) {data += chunk; if (Buffer.byteLength(data) > 8192) return reply(413,{status:'too large'});}
      const value = JSON.parse(data);
      if (!validHeartbeat(value) || (heartbeat && value.checkedAtEpoch <= heartbeat.checkedAtEpoch)) return reply(400,{status:'invalid heartbeat'});
      const filtered = {checkedAtEpoch:value.checkedAtEpoch, passed:value.passed, checks:Object.fromEntries(requiredChecks.map(k=>[k,value.checks[k]]))};
      await mkdir(dirname(statePath),{recursive:true,mode:0o700});
      await writeFile(`${statePath}.tmp`,JSON.stringify(filtered),{mode:0o600});
      await rename(`${statePath}.tmp`,statePath);
      heartbeat = filtered;
      return reply(200,{status:'accepted'});
    } catch {return reply(400,{status:'invalid heartbeat'});}
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 15000;
  await new Promise(resolve => server.listen(Number(env.PORT || 8080),'0.0.0.0',resolve));
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const results = await Promise.all([checkUrl(env.WEBSITE_URL),checkUrl(env.BACKEND_URL)]);
      websitesHealthy = results.every(Boolean); websitesCheckedAt = Date.now();
      console.log(JSON.stringify({checkedAt:new Date().toISOString(),website:results[0],backend:results[1],database:databaseHealthy(heartbeat),failedDatabaseChecks:requiredChecks.filter(k=>heartbeat?.checks?.[k] !== true)}));
      // An HTTPS request through App Service records its standard Http5xx metric.
      // /ready remains independent: a backup warning must never recycle the shared worker.
      if (env.PROBE_URL && (heartbeat || Date.now()-startedAt > 600000)) await fetch(env.PROBE_URL,{signal:AbortSignal.timeout(15000)}).then(r=>r.body?.cancel()).catch(()=>{});
    } finally {ticking = false;}
  };
  const interval = setInterval(tick,120000);
  void tick();
  server.on('close',()=>clearInterval(interval));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await start();
