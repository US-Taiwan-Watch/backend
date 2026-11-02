import { parseOpenAIOutputJson } from "../../../collections/Peoples/utils/extract";

export const classifyBill = async (summary: string, categories: any[]) => {
  if (!categories || categories.length === 0) return [];
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiEndpoint = process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1";
    const openaiModel = process.env.OPENAI_MODEL_BASIC || "gpt-4o-mini";
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY env variable is not set");

    const categoryList = categories
      .map((c) => `- ID: ${c.id}, Name: ${c.nameEn} / ${c.nameZh}`)
      .join("\n");

    const systemPrompt = "You are a helpful classification assistant.";
    const userPrompt = `
      You are an expert in classifying U.S. congressional bills for 'US Taiwan Watch'.

      Bill Summary:
      """${summary}"""

      Available Categories:
      ${categoryList}

      Task:
      Identify the most relevant 1 to 2 categories for this bill based on the summary.

      Requirements:
      1. Return ONLY a JSON array of the matching Category IDs (e.g., ["id1", "id2"]).
      2. Select at least 1 and at most 2 categories.
      3. Do not include any explanation or markdown.
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
      body.temperature = 0.1;
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
    const ids = parseOpenAIOutputJson(respJson);
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error("Error classifying bill:", error);
    return [];
  }
};
