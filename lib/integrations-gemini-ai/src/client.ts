import { GoogleGenAI } from "@google/genai";

/**
 * Creates a Gemini AI client using the user-provided API key.
 * Throws a clear error if no key is supplied so the frontend can prompt the user to set one.
 */
export function getGeminiClient(apiKey?: string) {
  const key = apiKey?.trim();
  if (!key) {
    throw Object.assign(new Error("No Gemini API key provided. Please set your API key in the settings panel."), { status: 401 });
  }
  return new GoogleGenAI({ apiKey: key });
}

// Legacy compatibility export. It still requires a user-provided key at call sites.
export const ai = {
  get models() {
    return getGeminiClient().models;
  },
};
