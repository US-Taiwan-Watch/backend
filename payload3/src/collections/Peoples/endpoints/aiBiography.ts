import type { PayloadHandler } from 'payload';
import { generateBiography } from '../services/dataGenerate';

type AiBiographyRequestBody = {
  bioGuideId: string;
};

export const aiBiographyHandler: PayloadHandler = async (req) => {
  try {
    const { bioGuideId } = await req.json() as AiBiographyRequestBody;
    if (!bioGuideId) {
      return Response.json({ error: 'Missing bioGuideId' }, { status: 400 });
    }

    const aiBiographyObj = await generateBiography(bioGuideId);
    const excludeChinese = { en: aiBiographyObj.en }
    return Response.json({ text: JSON.stringify(excludeChinese) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
