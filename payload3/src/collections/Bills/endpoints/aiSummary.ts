import type { PayloadHandler } from 'payload';
import { generateSummary } from '../services/dataGenerate';
import { translateToChinese } from '../services/dataTranslate';

type AiSummaryRequestBody = {
  congress: number;
  billType: string;
  billNumber: string | number;
};

export const aiSummaryHandler: PayloadHandler = async (req) => {
  try {
    const { congress, billType, billNumber } = await req.json() as AiSummaryRequestBody;

    if (!congress || !billType || !billNumber) {
      return Response.json({ error: 'Missing congress, billType, or billNumber' }, { status: 400 });
    }

    const summaryObj = await generateSummary(congress, billType, billNumber);

    return Response.json({ text: JSON.stringify(summaryObj) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
};
