import { fetchJson, FetchJsonError } from '../../../services/fetchJson';

const base = 'https://api.congress.gov/v3';
const billTypes = new Set(['s', 'hr', 'sres', 'hres', 'sjres', 'hjres', 'sconres', 'hconres']);
const maxPages = 100;

function failure(message: string, statusCode = 502) {
  return Object.assign(new Error(message), { statusCode });
}

async function read(url: URL): Promise<any> {
  try { return await fetchJson(url, { timeoutMs: 30_000, maxBytes: 8 * 1024 * 1024 }); }
  catch (e) {
    if (e instanceof FetchJsonError && e.status === 404) throw failure('Congress bill data was not found', 404);
    throw failure('Congress data request failed; update stopped', e instanceof FetchJsonError && e.code === 'timeout' ? 504 : 502);
  }
}

function requestUrl(path: string, key: string, next?: string, current?: URL) {
  let url: URL;
  try { url = new URL(next ?? `${base}${path}`, current); }
  catch { throw failure('Invalid Congress pagination; update stopped'); }
  // Check provider-controlled links before attaching the credential.
  if (url.origin !== 'https://api.congress.gov' || url.pathname !== `/v3${path}` || url.username || url.password || url.hash) throw failure('Unexpected Congress pagination destination; update stopped');
  url.searchParams.set('api_key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '250');
  return url;
}

async function collection(path: string, field: string, key: string): Promise<any[]> {
  const seen = new Set<string>(), rows: any[] = [];
  let url = requestUrl(path, key), expected: number | undefined;
  for (let page = 0; page < maxPages; page++) {
    if (seen.has(url.href)) throw failure('Repeated Congress pagination page; update stopped');
    seen.add(url.href);
    const data = await read(url), count = data?.pagination?.count;
    if (!Array.isArray(data?.[field]) || !Number.isSafeInteger(count) || count < 0 || (expected !== undefined && count !== expected)) throw failure('Invalid or changing Congress collection; update stopped');
    expected = count; rows.push(...data[field]);
    const next = data.pagination.next;
    if (next === undefined || next === null || next === '') {
      if (rows.length !== expected) throw failure('Incomplete Congress collection; update stopped');
      return rows;
    }
    if (typeof next !== 'string' || !data[field].length || rows.length >= expected) throw failure('Invalid Congress pagination continuation; update stopped');
    url = requestUrl(path, key, next, url);
  }
  throw failure('Congress pagination exceeded its bound; update stopped');
}

export async function fetchCongressBillBundle(congress: string | number, type: string, number: string | number) {
  const congressNumber = String(congress), billNumber = String(number), billType = String(type).toLowerCase();
  if (!/^[1-9][0-9]{0,3}$/.test(congressNumber) || !/^[1-9][0-9]{0,8}$/.test(billNumber) || !billTypes.has(billType)) throw failure('Invalid bill identifier', 400);
  const key = process.env.CONGRESS_GOV_API_KEY;
  if (!key) throw failure('Congress API credential is not configured; update stopped', 503);
  const path = `/bill/${congressNumber}/${billType}/${billNumber}`;
  const [detail, actions, summaries, cosponsors] = await Promise.all([
    read(requestUrl(path, key)), collection(path + '/actions', 'actions', key),
    collection(path + '/summaries', 'summaries', key), collection(path + '/cosponsors', 'cosponsors', key),
  ]);
  if (!detail?.bill || typeof detail.bill !== 'object' || String(detail.bill.congress) !== congressNumber || String(detail.bill.number) !== billNumber || String(detail.bill.type).toLowerCase() !== billType) throw failure('Congress returned an unexpected bill; update stopped');
  return { bill: detail.bill, actions, summaries, cosponsors };
}
