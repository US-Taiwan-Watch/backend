import { fetchJson, FetchJsonError } from '../services/fetchJson';

type Counts = { total: number; success: number; failed: number };
type Stage = 'bills' | 'people';
type StageResult = { stage: Stage; ok: boolean; counts?: { insert?: Counts; update: Counts }; failure?: string; httpStatus?: number };
export type WeeklyUpdateReport = { ok: boolean; stages: StageResult[] };
type Logger = { info(message: string): void; error(message: string): void };

export class WeeklyUpdateError extends Error {
  constructor(public readonly report: WeeklyUpdateReport) {
    super('Weekly data update failed; inspect the stage results');
    this.name = 'WeeklyUpdateError';
  }
}

function counts(value: unknown): Counts | undefined {
  if (!value || typeof value !== 'object') return;
  const c = value as Counts;
  if (![c.total, c.success, c.failed].every(n => Number.isSafeInteger(n) && n >= 0) || c.success + c.failed !== c.total) return;
  return { total: c.total, success: c.success, failed: c.failed };
}

// Explicitly invoked orchestration only. Nothing registers or starts a schedule.
// The caller supplies trusted configuration and Payload 3's initialized logger.
export async function runWeeklyUpdate(options: {
  baseURL: string;
  headers: Record<string, string>;
  logger: Logger;
  timeoutMs?: number;
}): Promise<WeeklyUpdateReport> {
  let origin: URL;
  try { origin = new URL(options.baseURL); }
  catch { throw new Error('Weekly update requires a trusted origin'); }
  const local = ['localhost', '127.0.0.1', '[::1]', 'ustw-payload3-app'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local)) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('Weekly update requires a trusted HTTPS origin or the isolated local app');
  }
  const stages: Stage[] = ['bills', 'people'];
  const results = await Promise.all(stages.map(async (stage): Promise<StageResult> => {
    const route = stage === 'bills' ? '/api/bills/update-bill' : '/api/peoples/upsert-people';
    try {
      const value = await fetchJson(new URL(route, origin), { method: 'POST', headers: options.headers, timeoutMs: options.timeoutMs ?? 600_000, maxBytes: 1024 * 1024 });
      const body = value as { ok?: unknown; update?: unknown; insert?: unknown } | null;
      const update = counts(body?.update), insert = stage === 'people' ? counts(body?.insert) : undefined;
      if (!body || typeof body.ok !== 'boolean' || !update || (stage === 'people' && !insert)) return { stage, ok: false, failure: 'invalid_summary' };
      const failed = update.failed > 0 || (insert?.failed ?? 0) > 0;
      const ok = body.ok && !failed;
      return { stage, ok, counts: { update, ...(insert ? { insert } : {}) }, ...(ok ? {} : { failure: failed ? 'partial_failure' : 'reported_failure' }) };
    } catch (error) {
      return { stage, ok: false, failure: error instanceof FetchJsonError ? error.code : 'invalid_configuration', ...(error instanceof FetchJsonError && error.status ? { httpStatus: error.status } : {}) };
    }
  }));
  const report = { ok: results.every(r => r.ok), stages: results };
  for (const result of results) {
    const message = `[WeeklyUpdateJob] ${result.stage}: ${result.ok ? 'completed' : `FAILED (${result.failure}${result.httpStatus ? ` HTTP ${result.httpStatus}` : ''})`}`;
    if (result.ok) options.logger.info(message); else options.logger.error(message);
  }
  if (!report.ok) throw new WeeklyUpdateError(report);
  return report;
}
