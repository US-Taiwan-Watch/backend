import {
  fetchAllCongressData,
  fetchBillTrackers,
  fetchRelatedBills,
  fetchUstwBillCategories,
  ordinalSuffix,
  TYPE_MAP,
} from "../services/dataFetch";
import { processActions, processPeople, processTracker } from "../services/dataProcess";
import { generateSummary } from "../services/dataGenerate";
import { classifyBill } from "../services/dataClassify";
import { translateToChinese } from "../services/dataTranslate";

type ComposeBillArgs = {
  congress: string;
  type: string;
  number: string;
  detail: "full" | "partial";
  baseUrl: string;
  payload: any;
};

export const composeBill = async ({ congress, type, number, detail, baseUrl, payload }: ComposeBillArgs) => {
  console.log('Start fetching congress data & bill tracker...');
  const [data, trackersRaw] = await Promise.all([
    fetchAllCongressData(congress, type, number),
    fetchBillTrackers(congress, type, number),
  ]);

  if (!data.bill) {
    const err: any = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }

  // Reject unknown status before creating people or making further AI calls.
  const statusTracker = processTracker(trackersRaw);

  // 1. Process Actions
  console.log('Start processing actions...');
  const actionsAll = processActions(data.actions);
  const actionsOverview = [...actionsAll];

  // 2. Process Sponsors & Cosponsors (Collect IDs)
  console.log('Start processing people...');
  const { sponsor, cosponsors } = await processPeople(
    data.bill.sponsors, data.cosponsors, baseUrl, payload
  );

  // 3. Prepare English Data for Translation
  const title = data.bill.title;

  const enI18nBase: any = {
    title,
    actionsOverview,
    actionsAll,
  };

  let finalSummary: string | undefined;
  if (detail === "full") {
    console.log('Start generating summary...');
    const summaryText =
      data.summaries.length > 0 ? data.summaries[data.summaries.length - 1].text : "";

    const cleanedSummaryText = summaryText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const aiSummaryObj = await generateSummary(congress, type, number, cleanedSummaryText);
    finalSummary = aiSummaryObj.en || cleanedSummaryText;

    enI18nBase.summary = finalSummary;
  }

  // 4. Process Translation
  console.log('Start translating to chinese...');
  const zhI18n = await translateToChinese(enI18nBase);

  // 5. Status Tracker
  console.log('Start processing status tracker...');
  const segment = TYPE_MAP[type.toLowerCase()];
  const congressGovUrl = `https://www.congress.gov/bill/${congress}${ordinalSuffix(
    parseInt(congress, 10)
  )}-congress/${segment}/${number}`;

  // 6. Construct Partial Response
  const baseResponse: any = {
    i18n: {
      en: enI18nBase,
      zh: zhI18n,
    },
    congress: parseInt(congress, 10),
    number,
    type,
    introducedAt: {
      datetime: `${data.bill.introducedDate}T00:00:00.000Z`,
      precision: ["year", "month", "day"],
    },
    statusTracker,
    sponsor,
    cosponsors,
    congressGovUrl,
    title,
    latestActionTime: data.actions.length > 0 ? `${data.actions[0].actionDate}T00:00:00.000Z` : null,
  };

  if (detail === "partial") return baseResponse;

  // 7. Classify Bill
  console.log('Start classifying bill...');
  const categoriesList = await fetchUstwBillCategories(baseUrl);
  const categoryIds = await classifyBill(finalSummary || "", categoriesList);

  // 8. Related Bills
  console.log('Start fetching related bills...');
  const relatedBills = await fetchRelatedBills(
    title,
    data.summaries.length > 0 ? data.summaries[data.summaries.length - 1].text : ""
  );

  return {
    ...baseResponse,
    categories: categoryIds,
    relatedBills,
    tags: [],
    isFeatured: false,
    summary: finalSummary || "",
  };
};
