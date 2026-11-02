import type { PayloadHandler } from 'payload';
import { createPeopleBatch } from '../services/peopleCreate';
import { getInsertBioguideIds, getUpdateBioguideIds } from '../services/peopleFilter';
import { updatePeopleBatch } from '../services/peopleUpdate';
import { getBaseUrlFromReq } from '../utils/url';

export const upsertPeopleHandler: PayloadHandler = async (req) => {
  try {
    const baseUrl = getBaseUrlFromReq(req);

    // insert new people
    const insertBioguideIds = await getInsertBioguideIds(req.payload.db);
    const insertResults = await createPeopleBatch(baseUrl, req.payload, insertBioguideIds);

    const insertFailed = insertResults.filter((r) => !r.ok);
    const insertSummary = {
      total: insertBioguideIds.length,
      success: insertResults.length - insertFailed.length,
      failed: insertFailed.length,
      failedIds: insertFailed.map((r) => r.bioGuideId),
    };

    // update existing people
    // const updateBioguideIds = ["K000404", "Z000018", "W000831"];
    const updateBioguideIds = await getUpdateBioguideIds(req.payload.db);
    const updateResults = await updatePeopleBatch(baseUrl, req.payload, updateBioguideIds);

    const updateFailed = updateResults.filter((r) => !r.ok);
    const updateSuccess = updateResults.filter((r) => r.ok) as Array<{
      ok: true;
      bioGuideId: string;
      id: string | null;
      changed: boolean;
    }>;

    const changed = updateSuccess.filter((r) => r.changed).length;
    const skipped = updateSuccess.length - changed;

    const updateSummary = {
      total: updateBioguideIds.length,
      success: updateSuccess.length,
      failed: updateFailed.length,
      changed,
      skipped,
      failedIds: updateFailed.map((r) => r.bioGuideId),
    };

    const returnPayload = {
      ok: insertSummary.failed === 0 && updateSummary.failed === 0,
      insert: insertSummary,
      update: updateSummary,
    };

    console.log('Upsert People Summary:', returnPayload);
    return Response.json(returnPayload);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
