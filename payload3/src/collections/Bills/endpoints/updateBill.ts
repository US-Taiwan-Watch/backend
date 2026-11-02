import type { PayloadHandler } from 'payload';
import { fetchUstwCurrentBillKeys } from '../services/dataFetch';
import { updateBillBatch } from '../services/billUpdate';
import { getBaseUrlFromReq } from '../../../collections/Peoples/utils/url';


export const updateBillHandler: PayloadHandler = async (req) => {
  try {
    const baseUrl = getBaseUrlFromReq(req);

    // update existing bills
    const updateBillKeys = await fetchUstwCurrentBillKeys(req.payload.db);
    const updateResults = await updateBillBatch(baseUrl, req.payload, updateBillKeys);

    const updateFailed = updateResults.filter((r) => !r.ok);
    const updateSummary = {
      total: updateBillKeys.length,
      success: updateResults.length - updateFailed.length,
      failed: updateFailed.length,
      failedKeys: updateFailed.map((r: any) => r.key),
    };

    const returnPayload = {
      ok: updateSummary.failed === 0,
      update: updateSummary,
    };

    console.log('Update Bill Summary:', returnPayload);
    return Response.json(returnPayload);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
