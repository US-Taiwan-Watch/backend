import { extractOpenAIOutputText, parseOpenAIOutputJson } from "../utils/extract";

export const translateToChinese = async (enData) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT;
    const openaiModel = process.env.OPENAI_MODEL_BASIC || "gpt-4o-mini";
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY env variable is not set");

    const systemPrompt =
      "You are a professional translator and editor for 'US Taiwan Watch' (美國台灣觀測站). " +
      "Your tone should be knowledgeable, professional, yet accessible to a Taiwanese audience interested in US politics. " +
      "Return only valid JSON. No markdown, no explanations.";

    const userPrompt = `
      Please translate the following JSON object into Traditional Chinese (Taiwanese style).

      Input JSON:
      ${JSON.stringify(enData, null, 2)}

      Requirements:
      1. Return ONLY the valid JSON object. No markdown formatting or explanations.
      2. Maintain the exact same JSON structure and key order as much as possible.
      3. Translate all text fields (including but not limited to title, summary, actionsOverview.chamber, actionsOverview.description, actionsAll.chamber, actionsAll.description).
      4. Use the requested "US Taiwan Watch" tone.
      5. Do not add or remove fields. Do not change numbers, IDs, dates, or URLs.
      6. Special rule for "displayName": if the translated Traditional Chinese displayName contains any spaces, replace each space with the middle dot "·" (U+00B7).
      `.trim();

    const body: any = {
      model: openaiModel,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_output_tokens: 1600
    };

    if (!openaiModel.startsWith("gpt-5")) {
      body.temperature = 0.2;
    }

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
    return parseOpenAIOutputJson(respJson);
  } catch (error) {
    console.error("Error translating:", error);
    return {
      firstName: "",
      lastName: "",
      middleName: "",
      displayName: "",
      bio: "",
    };
  }
};
