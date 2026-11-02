import { parseOpenAIOutputJson } from "../../../collections/Peoples/utils/extract";

export const translateToChinese = async (enData) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT;
    const openaiModel = process.env.OPENAI_MODEL_BASIC || "gpt-4o-mini";
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY env variable is not set");
    }

    const systemPrompt =
      "You are a professional translator and editor for 'US Taiwan Watch' (美國台灣觀測站). " +
      "Your tone should be knowledgeable, professional, yet accessible to a Taiwanese audience interested in US politics.";

    const userPrompt = `
      Please translate the following JSON object into Traditional Chinese (Taiwanese style).

      Input JSON:
      ${JSON.stringify(enData, null, 2)}

      Requirements:
      1. Return ONLY the valid JSON object. No markdown formatting or explanations.
      2. Maintain the exact same JSON structure.
      3. Translate all text fields (title, summary, actionsOverview.chamber, actionsOverview.description, actionsAll.chamber, actionsAll.description) into Traditional Chinese.
      4. Use the requested "US Taiwan Watch" tone.
      `.trim();

    const body: any = {
      model: openaiModel,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
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
      title: "",
      summary: "",
      actionsOverview: [],
      actionsAll: []
    };
  }
};
