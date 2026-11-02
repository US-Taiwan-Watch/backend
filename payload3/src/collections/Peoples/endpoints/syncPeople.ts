import type { PayloadHandler } from 'payload';
import { getBaseUrlFromReq } from '../utils/url';
import { composePeople } from '../services/peopleCompose';

type SyncPeopleRequestBody = {
  bioGuideId: string;
};

export const syncPeopleHandler: PayloadHandler = async (req) => {
  try {
    const { bioGuideId } = await req.json() as SyncPeopleRequestBody;
    if (!bioGuideId) {
      return Response.json({ error: 'Missing bioGuideId' }, { status: 400 });
    }

    const baseUrl = getBaseUrlFromReq(req);
    const response = await composePeople({ baseUrl, bioGuideId, detail: "partial" });
    return Response.json(response);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err?.message || "Internal server error" }, { status: err?.statusCode || 500 });
  }
}
