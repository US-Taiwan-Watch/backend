import type { PayloadHandler } from 'payload';
import { getBaseUrlFromReq } from '../../../collections/Peoples/utils/url';
import { composeBill } from '../services/billCompose';

type SyncBillRequestBody = {
  congress: string;
  type: string;
  number: string;
};

export const syncBillHandler: PayloadHandler = async (req) => {
  try {
    const { congress, type, number } = await req.json() as SyncBillRequestBody;
    if (!congress || !type || !number) {
      return Response.json({ error: 'Missing bill basic infomation' }, { status: 400 });
    }

    const baseUrl = getBaseUrlFromReq(req);
    const response = await composeBill({
      congress, type, number, detail: "partial", baseUrl, payload: req.payload
    });
    return Response.json(response);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err?.message || "Internal server error" }, { status: err?.statusCode || 500 });
  }
}
