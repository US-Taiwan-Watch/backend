import { required } from './config';

const podcastId = '6cdfccc6-7c47-4c35-8352-7f634b1b6f71';
// Only the existing client episode-list GET is supported; no arbitrary URL or write method.
export async function realPodcastOptions() {
  const credential = { endpoint: 'https://api.soundon.fm', podcastId, token: required('SOUNDON_API_TOKEN') };
  const response = await fetch(`${credential.endpoint}/v2/client/podcasts/${podcastId}/episodes`, {
    method: 'GET', headers: { 'Api-Token': credential.token },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error('Podcast service unavailable');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Podcast service unavailable');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 8 * 1024 * 1024) throw Error('Podcast response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!Array.isArray(data.data) || data.data.length > 5000) throw Error('Invalid podcast response');
  const options = data.data.map((row: any) => {
    const episode = row?.data;
    if (!episode || !/^[a-f0-9-]{36}$/i.test(episode.id) || typeof episode.title !== 'string' ||
        !episode.title.trim() || episode.title.length > 2000 || episode.podcastId !== podcastId) throw Error('Invalid episode metadata');
    return { label: episode.title, value: episode.id };
  });
  if (new Set(options.map((row: any) => row.value)).size !== options.length) throw Error('Duplicate episode IDs');
  return options;
}

export async function podcastEndpoint(req: any) {
  if (req.user?.collection !== 'users') return Response.json({ error: 'Administrator access required' }, { status: req.user ? 403 : 401 });
  try {
    return Response.json({ mode: 'soundon', options: await realPodcastOptions() }, { headers: { 'cache-control': 'private, no-store' } });
  } catch {
    // Never log provider responses, credentials or fetch options.
    return Response.json({ error: 'Podcast service unavailable. Existing selection is unchanged.' }, { status: 502, headers: { 'cache-control': 'private, no-store' } });
  }
}
