import { GoogleGenAI, Modality } from "@google/genai";

function getImageClient(apiKey?: string) {
  const key = apiKey?.trim();
  if (!key) {
    throw Object.assign(
      new Error("No Gemini API key provided. Please set your API key in the settings panel."),
      { status: 401 },
    );
  }

  return new GoogleGenAI({ apiKey: key });
}

export const ai = {
  get models() {
    return getImageClient().models;
  },
};

/**
 * Generate an image and return as base64 data URL.
 * Uses the user-provided Gemini API key.
 */
export async function generateImage(prompt: string, apiKey?: string): Promise<string> {
  const response = await getImageClient(apiKey).models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in response");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}
