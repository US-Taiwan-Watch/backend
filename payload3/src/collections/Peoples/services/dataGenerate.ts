import { parseOpenAIOutputJson } from "../utils/extract";

export const generateBiography = async (bioGuideId: string) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT;
    const openaiModel = process.env.OPENAI_MODEL_BASIC || "gpt-4o-mini";
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY env variable is not set");

    const profileUrl = `https://bioguide.congress.gov/search/bio/${encodeURIComponent(
      bioGuideId
    )}.json`;

    const prompt = `
    You must use the web_search tool.

    Target URL:
    ${profileUrl}

    Task:
    1) Retrieve the JSON at the Target URL (or an authoritative source that directly reflects that exact JSON).
    2) Extract the value of data.profileText as faithfully as possible (do not paraphrase it).
    3) Using ONLY that profileText, write a concise, polished biography suitable for an official congressional profile page.

    Biography requirements:
    - Length: 90–110 words.
    - Format: Single paragraph.
    - Tone: Neutral, factual, professional (official House biography style).
    - Style: Third person; begin with their title and state if supported by profileText (e.g., "Representative X of Wisconsin...").
    - Constraints: Do NOT invent details beyond what appears in profileText.
    - Do NOT mention searching, links, sources, citations, or that you retrieved anything.

    Translation requirements (ZH):
    - Translate the English biography into Traditional Chinese (Taiwanese style).
    - Tone: knowledgeable, professional, yet accessible to a Taiwanese audience interested in US politics (US Taiwan Watch tone).
    - Faithful translation; do not add new facts.

    Output:
    - Return ONLY valid JSON (no markdown, no commentary) with exactly these keys:
      {"en":"...","zh":"..."}
    - If you cannot reliably access data.profileText or cannot produce a faithful biography, return exactly this JSON:
      {"en": "N/A","zh": "N/A"}
    `.trim();

    const body: any = {
      model: openaiModel,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      max_output_tokens: 800,
      input: prompt,
    };

    if (!openaiModel.startsWith("gpt-5")) {
      body.temperature = 0.2;
    }

    const res = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    }

    const respJson: any = await res.json();
    return parseOpenAIOutputJson(respJson);
  } catch (error) {
    console.error("Error generating biography:", error);
    return { en: "", zh: "" };
  }
};

// export const generateBiography = async (bioGuideId: string): Promise<string> => {
//   try {
//     // ---------- 1. Fetch profile from bioguide ----------
//     const profileText = await fetchBioguideProfileText(bioGuideId);

//     // ---------- 2. Call Azure OpenAI for a 100-word summary ----------
//     const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
//     const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
//     const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
//     const apiVersion = process.env.OPENAI_API_VERSION || '2025-01-01-preview';

//     if (!azureEndpoint || !azureApiKey || !azureDeployment) {
//       throw new Error('Azure OpenAI env variables are not set');
//     }

//     const chatUrl =
//       `${azureEndpoint}/openai/deployments/${azureDeployment}` +
//       `/chat/completions?api-version=${apiVersion}`;

//     let prompt: string;
//     if (profileText.length > 0) {
//       prompt = `
//       Task:
//       Using the following profile text (retrieved from the link), write a concise, polished biography suitable for an official congressional profile page.

//       Profile Text:
//       "${profileText}"

//       Requirements:
//       1. Length: 90–110 words.
//       2. Format: Single paragraph.
//       3. Tone: Neutral, factual, and professional — similar to an official biography on the U.S. House of Representatives website.
//       4. Style:
//         - Write in the third person using the legislator’s full name (e.g., "Ami Bera" or "Representative Bera"), not pronouns like "they" or "this member".
//         - Begin with their title and state (e.g., "Representative Ami Bera of California...").
//         - Maintain a smooth, narrative flow that highlights education, career, and congressional service.
//       5. Content:
//         - Emphasize their role in Congress, public service background, and key stages of their professional journey.
//         - Avoid opinions, speculation, or unnecessary adjectives.
//       6. Constraints:
//         - Do NOT invent details beyond what is provided.
//         - Do NOT mention that the text was retrieved or summarized from another source.
//       `;
//     } else {
//       prompt = `
//       You are an expert biographer of U.S. politicians.

//       You are given only the Bioguide ID of a U.S. legislator:
//       - Bioguide ID: ${bioGuideId}

//       Based on your existing knowledge or search from internet, write a concise English biography of about 100 words describing this person.

//       If you do NOT recognize this Bioguide ID or do not have enough knowledge about this specific legislator:
//       - Do NOT invent specific personal details (such as date of birth, exact state, or exact offices held).
//       - Instead, write a generic 100-word biography describing a typical U.S. member of Congress in neutral and realistic terms.

//       Requirements:
//       - Length: 90–110 words.
//       - One paragraph.
//       - Neutral, factual tone.
//       - Do not mention that you are summarizing, that you lack information, or that you are guessing.
//       `.trim();
//     }

//     const aiRes = await fetch(chatUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'api-key': azureApiKey,
//       },
//       body: JSON.stringify({
//         messages: [
//           {
//             role: 'system',
//             content: 'You are an expert biographer specializing in U.S. congressional members.',
//           },
//           { role: 'user', content: prompt },
//         ],
//         temperature: 0.2,
//         max_tokens: 400,
//       }),
//     });

//     if (!aiRes.ok) {
//       throw new Error(`Azure OpenAI API error: ${aiRes.status, await aiRes.text()}`);
//     }

//     const aoaiJson: any = await aiRes.json();
//     const aiText: string =
//       aoaiJson?.choices?.[0]?.message?.content?.trim?.() || '';

//     return aiText;
//   } catch (error) {
//     console.error('Error generating biography:', error);
//     return "";
//   }
// }
