
import { parse } from 'node-html-parser';
import { findAzureSearchRelated } from "../../../services/azureSearch";
import { parseOpenAIOutputJson } from "../../../collections/Peoples/utils/extract";
import { BillKey } from "./billUpdate";
import { getCurrentCongress } from "../util/current";
export { fetchCongressBillBundle as fetchAllCongressData } from './congress';

export const TYPE_MAP = {
  's': 'senate-bill',
  'hr': 'house-bill',
  'sres': 'senate-resolution',
  'hres': 'house-resolution',
  'sjres': 'senate-joint-resolution',
  'hjres': 'house-joint-resolution',
  'sconres': 'senate-concurrent-resolution',
  'hconres': 'house-concurrent-resolution',
};

export const fetchUstwPeopleIds = async (bioguideIds, baseUrl) => {
  if (!bioguideIds || bioguideIds.length === 0) return {};

  try {
    const query = `
      query PeoplesFilter($limit: Int, $bioGuideIds: [String]) {
        PeoplesFilter(limit: $limit, where: { congressionalData__bioGuideId: { in: $bioGuideIds } }) {
          docs {
            id
            congressionalData { bioGuideId }
          }
        }
      }
    `;

    const response = await fetch(`${baseUrl}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          limit: bioguideIds.length,
          bioGuideIds: bioguideIds
        }
      })
    });

    if (!response.ok) {
      console.error("Ustw people IDs fetch failed:", response.statusText);
      return {};
    }

    const json = await response.json();
    const docs = json?.data?.PeoplesFilter?.docs || [];

    return docs.reduce((acc, doc) => {
      acc[doc.congressionalData.bioGuideId] = doc.id;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching Ustw people IDs:", error);
    return {};
  }
};

export const fetchUstwBillCategories = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/categories-bill`);
    if (!response.ok) {
      console.error("Ustw bill categories fetch failed:", response.statusText);
      return [];
    }

    const json = await response.json();
    return json?.docs || [];
  } catch (error) {
    console.error("Error fetching Ustw categories:", error);
    return [];
  }
};

export const fetchRelatedBills = async (title, summary) => {
  try {
    const searchText = `Title: ${title}, Summary: ${summary}`;
    const hits = await findAzureSearchRelated(searchText, 5);

    const SCORE_THRESHOLD = 1.0;
    const relatedBills = [];

    for (const { score, doc } of hits) {
      if (score > SCORE_THRESHOLD && doc.id) {
        relatedBills.push(doc.id);
      }
    }

    return relatedBills;
  } catch (error) {
    console.error("Error fetching related bills:", error);
    return [];
  }
};

// export const fetchBillTrackers = async (congress, type, number) => {
//   const firecrawl = new Firecrawl({
//     apiKey: process.env.FIRECRAWL_API_KEY,
//   });

//   const resource = TYPE_MAP[type.toLowerCase()];
//   if (!resource) return null;

//   const url = `https://www.congress.gov/bill/${congress}${ordinalSuffix(parseInt(congress))}-congress/${resource}/${number}`;

//   try {
//     const result = await firecrawl.scrape(url, { formats: ["html"] });
//     if (!result || !result.html) {
//       console.error("Firecrawl returned no HTML");
//       return null;
//     }

//     const root = parse(result.html);
//     const trackers = [];

//     const items = root.querySelectorAll('ol.bill_progress > li');
//     items.forEach(el => {
//       const stepName = el.text.trim();
//       // Get direct text content (first child usually)
//       const firstChild = el.childNodes[0];
//       const firstText = firstChild ? firstChild.text.trim() : '';

//       const selected = el.classList.contains('selected');
//       trackers.push({ stepName: firstText || stepName, selected });
//     });

//     return trackers;
//   } catch (error) {
//     console.error("Error scraping bill trackers:", error);
//     return null;
//   }
// };

export const fetchBillTrackers = async (
  congress: string | number,
  type: string,
  number: string | number
) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT;
    const openAIModel = process.env.OPENAI_MODEL_ADVANCE || "gpt-5-mini";
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY is not set");

    const resource = TYPE_MAP[type.toLowerCase()];
    if (!resource) return null;

    const c = String(congress);
    const n = String(number);

    const url =
      `https://www.congress.gov/bill/` +
      `${c}${ordinalSuffix(parseInt(c, 10))}-congress/` +
      `${resource}/${n}`;

    const prompt = `
      You must use the web_search tool.

      Target page: ${url}

      Goal:
      Return the bill progress tracker steps as a JSON array in this exact shape:
      [
        { "stepName": "<string>", "selected": <boolean> },
        ...
      ]

      Extraction rules (strict):
      1) Find the tracker steps as displayed on the page (often labeled "Tracker", "Bill Tracker", or "Status of Legislation").
      2) Extract step labels in the exact order shown (no paraphrasing).
      3) Set selected=true only for the single step that the page explicitly indicates is current/active.
        - Acceptable signals: a clear "This bill has the status X" statement, or an explicit indication of the current/active step.
        - Do NOT guess. If you cannot unambiguously determine the current step, output exactly: null
      4) Output MUST be valid JSON only (no markdown, no commentary, no extra keys).
      `.trim();

    const body: any = {
      model: openAIModel,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      input: prompt
    };

    const res = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    }

    const respJson = await res.json();
    const parsed = parseOpenAIOutputJson(respJson);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid Model Output: Not Array')
    };

    for (const x of parsed) {
      if (typeof x?.stepName !== "string" || typeof x?.selected !== "boolean") {
        throw new Error('Invalid Model Output: Invalid Format')
      };
    }

    return parsed;
  } catch (error) {
    console.error("Error fetching bill trackers via OpenAI:", error);
    return null;
  }
};

export const ordinalSuffix = (i) => {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

export const fetchUstwCurrentBillKeys = async (db): Promise<BillKey[]> => {
  try {
    const docs = await db.collections["bills"]
      .find(
        { congress: getCurrentCongress() },
        { congress: 1, type: 1, number: 1 }
      )
      .lean();

    const keys: BillKey[] = docs
      .map((d: any) => ({
        congress: String(d.congress),
        type: String(d.type),
        number: String(d.number),
      }))
      .filter(
        (k) => k.congress && k.type && k.number
      )
      .sort((a, b) =>
        a.type === b.type
          ? Number(a.number) - Number(b.number)
          : a.type.localeCompare(b.type)
      );

    return keys;
  } catch (error) {
    console.error("Error fetching USTW current bill keys:", error);
    return [];
  }
};
