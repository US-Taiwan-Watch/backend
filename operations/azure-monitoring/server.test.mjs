import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requiredChecks,validHeartbeat,databaseHealthy,authenticated,checkUrl,start} from './server.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const value = () => ({checkedAtEpoch:Math.floor(Date.now()/1000),passed:true,checks:Object.fromEntries(requiredChecks.map(k=>[k,true]))});
test('every required database check is enforced, including backup and TLS',()=>{
  assert.equal(databaseHealthy(value()),true);
  for (const check of requiredChecks) {const v=value();v.checks[check]=false;assert.equal(databaseHealthy(v),false);delete v.checks[check];assert.equal(validHeartbeat(v),false);}
});
test('missing, stale, future, and failed database reports fail closed',()=>{
  for (const v of [null,{}, {...value(),passed:false},{...value(),checkedAtEpoch:1},{...value(),checkedAtEpoch:Math.floor(Date.now()/1000)+120}]) assert.equal(databaseHealthy(v),false);
});
test('only exact bearer token accepted',()=>{
  const t='x'.repeat(48); assert.equal(authenticated(`Bearer ${t}`,t),true);
  for (const h of ['',`Bearer ${'y'.repeat(48)}`,t]) assert.equal(authenticated(h,t),false);
});
test('renewal failures fail closed while older complete reports remain compatible',()=>{
  assert.equal(databaseHealthy(value()),true);
  for(const key of ['certificateRenewalHealthy','certificateIssuerValidBeyond90Days','certificateRenewalTimerActive']){
    const report=value();report.checks[key]=false;assert.equal(databaseHealthy(report),false);
    report.checks[key]='wrong type';assert.equal(validHeartbeat(report),false);
    report.checks[key]=true;assert.equal(databaseHealthy(report),true);
  }
});
test('website failure, network failure, redirects, and invalid backend payload fail closed',async()=>{
  assert.equal(await checkUrl('http://example.com'),false);
  assert.equal(await checkUrl('https://example.com',async()=>{throw Error();}),false);
  assert.equal(await checkUrl('https://example.com',async()=>new Response('',{status:503})),false);
  assert.equal(await checkUrl('https://example.com/api/health',async()=>Response.json({status:'error'})),false);
  assert.equal(await checkUrl('https://example.com/api/health',async()=>Response.json({status:'ok'})),true);
  assert.equal(await checkUrl('https://example.com/en-US',async()=>new Response('ok')),true);
});
test('HTTP authentication, replay rejection, persistence, failure and recovery',async()=>{
  const directory = await mkdtemp(join(tmpdir(),'ustw-monitor-'));
  const token = 't'.repeat(48), realFetch = global.fetch;
  global.fetch = async url => new URL(url).pathname === '/api/health' ? Response.json({status:'ok'}) : new Response('ok');
  const env={HEARTBEAT_TOKEN:token,PORT:'0',STATE_PATH:join(directory,'heartbeat.json'),WEBSITE_URL:'https://website.example/en-US',BACKEND_URL:'https://backend.example/api/health'};
  let server;
  const close = async()=>{server.closeAllConnections(); await new Promise(r=>server.close(r));};
  try {
    server = await start(env);
    let origin = `http://127.0.0.1:${server.address().port}`;
    const post = async (v, auth=`Bearer ${token}`)=> realFetch(origin+'/heartbeat',{method:'POST',headers:{authorization:auth},body:JSON.stringify(v)});
    assert.equal((await realFetch(origin+'/probe')).status,503);
    assert.equal((await realFetch(origin+'/ready')).status,200);
    assert.equal((await post(value(),'Bearer wrong')).status,401);
    const first=value();
    assert.equal((await post(first)).status,200);
    assert.equal((await post(first)).status,400);
    assert.equal((await realFetch(origin+'/probe')).status,200);
    const bad={...value(),checkedAtEpoch:first.checkedAtEpoch+1};bad.checks.recentFullBackup=false;
    assert.equal((await post(bad)).status,200);
    assert.equal((await realFetch(origin+'/probe')).status,503);
    assert.equal((await realFetch(origin+'/ready')).status,200);
    const recovered={...value(),checkedAtEpoch:first.checkedAtEpoch+2};
    assert.equal((await post(recovered)).status,200);
    assert.equal((await realFetch(origin+'/probe')).status,200);
    await close();server=await start(env);origin=`http://127.0.0.1:${server.address().port}`;
    await realFetch(origin+'/ready');
    assert.equal((await realFetch(origin+'/probe')).status,200);
    assert.equal((await post(recovered)).status,400);
  } finally {if(server) await close();global.fetch=realFetch;await rm(directory,{recursive:true,force:true});}
});
