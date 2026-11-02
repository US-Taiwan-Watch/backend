import { composePeople } from "../services/peopleCompose";

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const createPeople = async (baseUrl, payload, bioGuideId) => {
  const personData = await composePeople({ baseUrl, bioGuideId, detail: "full" });
  return payload.create({
    collection: "peoples",
    data: personData,
  });
};

export const createPeopleBatch = async (baseUrl, payload, bioguideIds) => {
  const BATCH_SIZE = 10;
  const batches = chunk(bioguideIds, BATCH_SIZE);

  const createOneSafe = async (bioGuideId: string) => {
    try {
      const doc = await createPeople(baseUrl, payload, bioGuideId);
      return { ok: true as const, bioGuideId, id: doc?.id ?? null };
    } catch (e: any) {
      return { ok: false as const, bioGuideId, message: e?.message || String(e) };
    }
  };

  const results: Array<
    | { ok: true; bioGuideId: string; id: string | null }
    | { ok: false; bioGuideId: string; message: string }
  > = [];

  const total = bioguideIds.length;
  let done = 0;
  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchResults = await Promise.all(batch.map(createOneSafe));
    results.push(...batchResults);

    const batchFailed = batchResults.filter((r) => !r.ok) as Array<{
      ok: false;
      bioGuideId: string;
      message: string;
    }>;

    const batchOk = batchResults.length - batchFailed.length;

    done += batchResults.length;
    okCount += batchOk;
    failCount += batchFailed.length;

    const remaining = total - done;
    const failedIds = batchFailed.map((r) => r.bioGuideId);

    console.log(
      `[Create People] Batch ${i + 1}/${batches.length} done. ` +
      `batchOk=${batchOk} batchFailed=${batchFailed.length}. ` +
      `totalOk=${okCount} totalFailed=${failCount}. remaining=${remaining}`
    );

    if (failedIds.length > 0) {
      console.log(`[Create People] Failed bioGuideIds: ${failedIds.join(", ")}`);
    }
  }
  return results;
};
