import type { PayloadHandler } from 'payload';
import { getBaseUrlFromReq } from '../../../collections/Peoples/utils/url';
import { composeBill } from '../services/billCompose';

type FetchBillRequestBody = {
  congress: string;
  type: string;
  number: string;
};

export const fetchBillHandler: PayloadHandler = async (req) => {
  try {
    const { congress, type, number } = await req.json() as FetchBillRequestBody;
    if (!congress || !type || !number) {
      return Response.json({ error: 'Missing bill basic infomation' }, { status: 400 });
    }

    const baseUrl = getBaseUrlFromReq(req);
    const response = await composeBill({
      congress, type, number, detail: "full", baseUrl, payload: req.payload
    });
    return Response.json(response);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err?.message || "Internal server error" }, { status: err?.statusCode || 500 });
  }
}
