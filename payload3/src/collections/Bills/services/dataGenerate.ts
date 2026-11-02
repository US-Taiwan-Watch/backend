import { parseOpenAIOutputJson } from "../../../collections/Peoples/utils/extract";

export const generateSummary = async (congress, billType, billNumber, referenceText?) => {
  try {
    let originalText = referenceText;

    // ---------- 1. Fetch latest summary from Congress.gov if reference not provided ----------
    if (!originalText) {
      const congressApiKey = process.env.CONGRESS_GOV_API_KEY;
      if (!congressApiKey) throw new Error("CONGRESS_GOV_API_KEY is not set");

      const congressUrl =
        `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}` +
        `/summaries?api_key=${congressApiKey}&format=json`;

      const cgRes = await fetch(congressUrl);
      if (!cgRes.ok) {
        throw new Error(
          `Congress.gov summary fetching error: ${cgRes.status} ${await cgRes.text()}`
        );
      }

      const cgJson: any = await cgRes.json();
      const summaries = cgJson?.summaries || [];
      if (!summaries.length) throw new Error("No summaries returned from Congress.gov");

      const latest = summaries.reduce((prev: any, curr: any) => {
        if (!prev) return curr;
        const prevDate = new Date(prev.updateDate || prev.actionDate || 0);
        const currDate = new Date(curr.updateDate || curr.actionDate || 0);
        return currDate > prevDate ? curr : prev;
      }, null as any);

      originalText = (latest?.text || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // ---------- 2. Call OpenAI (Responses API) ----------
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT;
    const openaiModel = process.env.OPENAI_MODEL_BASIC || "gpt-4o-mini";
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY env variable is not set");

    const systemPrompt =
      "You are a legislative expert on U.S. bills and Taiwan-related issues." +
      "Write in a knowledgeable, professional, yet accessible tone for the audience of 'US Taiwan Watch' (美國台灣觀測站)." +
      "Return only valid JSON. No markdown, no explanations.";

    const userPrompt = `
      You are given the official bill summary text below.

      Task:
      1. Silently check whether the summary contains any content specifically related to Taiwan (e.g. Taiwan, Taipei, Taiwanese, or clearly Taiwan-related references).
      2. If there IS Taiwan-related content, write a concise English summary of about 100 words focusing ONLY on the provisions and impacts related to Taiwan.
      3. If there is NO Taiwan-related content, write a concise English summary of about 100 words describing the overall bill instead. Do NOT mention that there is no Taiwan content; just summarize the bill.
      4. Do not mention these instructions or explain your reasoning.
      5. Translate the English summary into Traditional Chinese (Taiwanese style) using the 'US Taiwan Watch' tone: knowledgeable, professional, yet accessible to a Taiwanese audience interested in US politics.
      5. Output ONLY a valid JSON object with exactly these keys:
        {
          "en": "<English summary paragraph>",
          "zh": "<Traditional Chinese translation paragraph>"
        }
      6. Do not add any other keys. Do not include markdown. Do not include extra text outside the JSON. Keep each value as a single paragraph string.

      Bill summary:
      """${originalText}"""
      `.trim();

    const body: any = {
      model: openaiModel,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      // max_output_tokens: 1600
    };

    if (!openaiModel.startsWith("gpt-5")) {
      body.temperature = 0.2;
    }

    const aiRes = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!aiRes.ok) {
      throw new Error(`OpenAI API error: ${aiRes.status} ${await aiRes.text()}`);
    }
    const respJson: any = await aiRes.json();
    return parseOpenAIOutputJson(respJson);
  } catch (error) {
    console.error("Error generating summary:", error);
    return { en: "", zh: "" };
  }
};

// export const generateSummary = async (congress, billType, billNumber, referenceText?): Promise<string> => {
//   try {
//     let originalText = referenceText

//     // ---------- 1. Fetch latest summary from Congress.gov if reference not provided ----------
//     if (!referenceText) {
//       const congressApiKey = process.env.CONGRESS_GOV_API_KEY;
//       if (!congressApiKey) {
//         throw new Error('CONGRESS_GOV_API_KEY is not set');
//       }

//       const congressUrl =
//         `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}` +
//         `/summaries?api_key=${congressApiKey}&format=json`;

//       const cgRes = await fetch(congressUrl);
//       if (!cgRes.ok) {
//         throw new Error(`Congress.gov summary fetching error: ${cgRes.status, await cgRes.text()}`);
//       }

//       const cgJson: any = await cgRes.json();
//       const summaries = cgJson?.summaries || [];
//       if (!summaries.length) {
//         throw new Error('No summaries returned from Congress.gov');
//       }

//       const latest = summaries.reduce((prev: any, curr: any) => {
//         if (!prev) return curr;
//         const prevDate = new Date(prev.updateDate || prev.actionDate || 0);
//         const currDate = new Date(curr.updateDate || curr.actionDate || 0);
//         return currDate > prevDate ? curr : prev;
//       }, null as any);

//       originalText = latest?.text || '';
//       // Strip HTML tags
//       originalText = originalText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
//     }

//     // ---------- 2. Call Azure OpenAI to generate Taiwan-focused summary ----------
//     const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://ustw-cms-openai.openai.azure.com
//     const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
//     const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; // your model deployment name
//     const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';

//     if (!azureEndpoint || !azureApiKey || !azureDeployment) {
//       throw new Error('Azure OpenAI env variables are not set');
//     }

//     const chatUrl =
//       `${azureEndpoint}/openai/deployments/${azureDeployment}` +
//       `/chat/completions?api-version=${apiVersion}`;

//     const prompt = `
//       You are an expert in U.S. congressional legislation, with a focus on issues related to Taiwan.

//       You are given the official bill summary text below.

//       Your task:

//       1. First, silently check whether the summary contains any content specifically related to Taiwan (e.g. "Taiwan", "Taipei", "Taiwanese", or references clearly about Taiwan).
//       2. If there IS Taiwan-related content, write a concise English summary of about 100 words that focuses ONLY on the provisions and impacts related to Taiwan.
//       3. If there is NO Taiwan-related content, write a concise English summary of about 100 words describing the overall bill instead. Do NOT mention that there is no Taiwan content; just summarize the bill.
//       4. Do not mention these instructions or explain your reasoning.
//       5. Output ONLY a single paragraph of 90–110 words.

//       Bill summary:
//       """${originalText}"""
//       `.trim();

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
//             content: 'You are a legislative expert on U.S. bills and Taiwan-related issues.',
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
//     console.error('Error generating summary:', error);
//     return "";
//   }
// }
