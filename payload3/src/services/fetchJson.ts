export type FetchJsonFailure = 'http' | 'network' | 'timeout' | 'invalid_json' | 'too_large';

export class FetchJsonError extends Error {
  constructor(public readonly code: FetchJsonFailure, public readonly status?: number) {
    // Never include upstream bodies, credential-bearing URLs or transport errors.
    super(status ? `JSON request failed (HTTP ${status})` : `JSON request failed (${code})`);
    this.name = 'FetchJsonError';
  }
}

export async function fetchJson(url: string | URL, options: {
  timeoutMs?: number;
  maxBytes?: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
} = {}): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxBytes = options.maxBytes ?? 32 * 1024 * 1024;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1_800_000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 32 * 1024 * 1024) {
    throw new Error('Invalid JSON request limits');
  }
  const signal = AbortSignal.timeout(timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, { method: options.method ?? 'GET', headers: options.headers, redirect: 'error', signal });
    if (!response.ok) { await response.body?.cancel(); throw new FetchJsonError('http', response.status); }
    if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new FetchJsonError('too_large'); }
    reader = response.body?.getReader();
    if (!reader) throw new FetchJsonError('invalid_json');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new FetchJsonError('too_large'); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new FetchJsonError('invalid_json'); }
  } catch (error) {
    if (error instanceof FetchJsonError) throw error;
    throw new FetchJsonError(signal.aborted ? 'timeout' : 'network');
  } finally { reader?.releaseLock(); }
}
