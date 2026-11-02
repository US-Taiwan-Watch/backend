import { composePeople } from "../services/peopleCompose";

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const toISO = (v: any): string | null => {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
};

const sortByJson = <T>(arr: T[]): T[] =>
  [...arr].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

const normalizeCommittee = (c: any) => ({
  systemCode: c?.systemCode ?? null,
  name: c?.name ?? null,
  title: c?.title ?? null,
  subcommittees: sortByJson(
    (c?.subcommittees ?? []).map((s: any) => ({
      systemCode: s?.systemCode ?? null,
      name: s?.name ?? null,
      title: s?.title ?? null,
    }))
  ),
});

const normalizePosition = (p: any) => ({
  title: p?.title ?? null,
  start: {
    datetime: toISO(p?.start?.datetime),
    precision: sortByJson(p?.start?.precision ?? []),
  },
  end: {
    datetime: toISO(p?.end?.datetime),
    precision: sortByJson(p?.end?.precision ?? []),
  },
  state: p?.state ?? null,
  district: p?.district == null ? null : Number(p.district),
  party: p?.party ?? null,
  congresses: [...(p?.congresses ?? [])].map(Number).sort((a, b) => a - b),
});

const pickComparablePeople = (doc: any) => ({
  i18n: {
    en: {
      firstName: doc?.i18n?.en?.firstName ?? null,
      lastName: doc?.i18n?.en?.lastName ?? null,
      displayName: doc?.i18n?.en?.displayName ?? null,
    },
  },
  birthday: {
    datetime: toISO(doc?.birthday?.datetime),
    precision: sortByJson(doc?.birthday?.precision ?? []),
  },
  gender: doc?.gender ?? null,
  congressionalData: {
    bioGuideId: doc?.congressionalData?.bioGuideId ?? null,
    govTrackId:
      doc?.congressionalData?.govTrackId == null
        ? null
        : Number(doc.congressionalData.govTrackId),
    committees: sortByJson((doc?.congressionalData?.committees ?? []).map(normalizeCommittee)),
  },
  experiences: sortByJson(
    (doc?.experiences ?? []).map((e: any) => ({
      company: e?.company ?? null,
      category:
        typeof e?.category === "object"
          ? String(e?.category?.id ?? e?.category?._id ?? "")
          : e?.category == null
            ? null
            : String(e.category),
      isCurrent: Boolean(e?.isCurrent),
      positions: sortByJson((e?.positions ?? []).map(normalizePosition)),
    }))
  ),
  links: sortByJson(
    (doc?.links ?? []).map((l: any) => ({
      type: l?.type ?? null,
      title: l?.title ?? null,
      link: l?.link ?? null,
    }))
  ),
  partyChangeRecords: sortByJson(
    (doc?.partyChangeRecords ?? []).map((r: any) => ({
      newParty: r?.newParty ?? null,
      oldParty: r?.oldParty ?? null,
      changedAt: {
        datetime: toISO(r?.changedAt?.datetime),
        precision: sortByJson(r?.changedAt?.precision ?? []),
      },
    }))
  )
});

const hasPeopleChanged = (existingDoc: any, nextData: any): boolean => {
  const a = JSON.stringify(pickComparablePeople(existingDoc));
  const b = JSON.stringify(pickComparablePeople(nextData));
  return a !== b;
};

export const updatePeople = async (baseUrl, payload, bioGuideId) => {
  const found = await payload.find({
    collection: "peoples",
    where: { "congressionalData.bioGuideId": { equals: bioGuideId } },
    limit: 1,
    depth: 0,
  });

  const existing = found?.docs?.[0];
  if (!existing) {
    throw new Error(`People not found for bioGuideId=${bioGuideId}`);
  }

  const personData = await composePeople({ baseUrl, bioGuideId, detail: "partial" });

  if (!hasPeopleChanged(existing, personData)) {
    return { id: existing.id, changed: false as const };
  }

  const doc = await payload.update({
    collection: "peoples",
    id: existing.id,
    data: personData,
  });

  return { id: doc?.id ?? existing.id, changed: true as const };
};

export const updatePeopleBatch = async (
  baseUrl,
  payload,
  bioguideIds,
  batchSize = 10
) => {
  const batches = chunk(bioguideIds, batchSize);

  const updateOneSafe = async (bioGuideId: string) => {
    try {
      const result = await updatePeople(baseUrl, payload, bioGuideId);
      return { ok: true as const, bioGuideId, id: result.id, changed: result.changed };
    } catch (e: any) {
      return { ok: false as const, bioGuideId, message: e?.message || String(e) };
    }
  };

  const results: Array<
    | { ok: true; bioGuideId: string; id: string | null; changed: boolean }
    | { ok: false; bioGuideId: string; message: string }
  > = [];

  const total = bioguideIds.length;
  let done = 0;
  let okCount = 0;
  let failCount = 0;
  let changedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchResults = await Promise.all(batch.map(updateOneSafe));
    results.push(...batchResults);

    const batchFailed = batchResults.filter((r) => !r.ok) as Array<{
      ok: false;
      bioGuideId: string;
      message: string;
    }>;

    const batchOkResults = batchResults.filter((r) => r.ok) as Array<{
      ok: true;
      bioGuideId: string;
      id: string | null;
      changed: boolean;
    }>;

    const batchChanged = batchOkResults.filter((r) => r.changed).length;
    const batchSkipped = batchOkResults.length - batchChanged;
    const batchOk = batchOkResults.length;

    done += batchResults.length;
    okCount += batchOk;
    failCount += batchFailed.length;
    changedCount += batchChanged;
    skippedCount += batchSkipped;

    const remaining = total - done;
    const failedIds = batchFailed.map((r) => r.bioGuideId);

    console.log(
      `[Update People] Batch ${i + 1}/${batches.length} done. ` +
      `batchOk=${batchOk} batchChanged=${batchChanged} batchSkipped=${batchSkipped} batchFailed=${batchFailed.length}. ` +
      `totalOk=${okCount} totalChanged=${changedCount} totalSkipped=${skippedCount} totalFailed=${failCount}. remaining=${remaining}`
    );

    if (failedIds.length > 0) {
      console.log(`[Update People] Failed bioGuideIds: ${failedIds.join(", ")}`);
    }
  }

  return results;
};
