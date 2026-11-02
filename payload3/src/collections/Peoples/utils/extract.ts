export const extractOpenAIOutputText = (respJson: any): string => {
  const direct = respJson?.output_text;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const output = respJson?.output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (item?.type !== "message") continue;

    const content = item?.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        return part.text;
      }
    }
  }

  return "";
};

export const parseOpenAIOutputJson = <T = any>(respJson: any): T => {
  const text = extractOpenAIOutputText(respJson).trim();
  if (!text) throw new Error("Invalid Model Output: Empty");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid Model Output: Not JSON");
  }
};
