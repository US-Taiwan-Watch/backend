import { composeBill } from "./billCompose";

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export type BillKey = {
  congress: string;
  type: string;
  number: string;
};

export const updateBill = async (baseUrl, payload, congress, type, number) => {
  console.log(`Updating bill: ${congress} ${type} ${number}`);
  const billData = await composeBill({ congress, type, number, baseUrl, detail: "partial", payload });

  const found = await payload.find({
    collection: "bills",
    where: {
      and: [
        { congress: { equals: parseInt(congress, 10) } },
        { type: { equals: type } },
        { number: { equals: number } },
      ],
    },
    limit: 1,
  });

  const existing = found?.docs?.[0];
  if (!existing) {
    throw new Error(`Bill not found for congress=${congress} type=${type} number=${number}`);
  }

  return payload.update({
    collection: "bills",
    id: existing.id,
    data: billData,
  });
};

export const updateBillBatch = async (
  baseUrl,
  payload,
  billKeys: BillKey[],
  batchSize = 10
) => {
  const batches = chunk(billKeys, batchSize);

  const updateOneSafe = async (k: BillKey) => {
    const key = `${k.congress}-${k.type}-${k.number}`;
    try {
      const doc = await updateBill(baseUrl, payload, k.congress, k.type, k.number);
      return { ok: true as const, key, id: doc?.id ?? null };
    } catch (e: any) {
      return { ok: false as const, key, message: e?.message || String(e) };
    }
  };

  const results: Array<
    | { ok: true; key: string; id: string | null }
    | { ok: false; key: string; message: string }
  > = [];

  const total = billKeys.length;
  let done = 0;
  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchResults = await Promise.all(batch.map(updateOneSafe));
    results.push(...batchResults);

    const batchFailed = batchResults.filter((r) => !r.ok) as Array<{
      ok: false;
      key: string;
      message: string;
    }>;

    const batchOk = batchResults.length - batchFailed.length;

    done += batchResults.length;
    okCount += batchOk;
    failCount += batchFailed.length;

    const remaining = total - done;
    const failedKeys = batchFailed.map((r) => r.key);

    console.log(
      `[Update Bills] Batch ${i + 1}/${batches.length} done. ` +
      `batchOk=${batchOk} batchFailed=${batchFailed.length}. ` +
      `totalOk=${okCount} totalFailed=${failCount}. remaining=${remaining}`
    );

    if (failedKeys.length > 0) {
      console.log(`[Update Bills] Failed keys: ${failedKeys.join(", ")}`);
    }
  }

  return results;
};
