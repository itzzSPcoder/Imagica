import { GoogleGenAI } from "@google/genai";

/**
 * Creates a Gemini AI client using the user-provided API key.
 * Throws a clear error if no key is supplied so the frontend can prompt the user to set one.
 */
function resolveGeminiApiKey(apiKey?: string): string | undefined {
  const explicit = apiKey?.trim();
  if (explicit) return explicit;

  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY?.trim() ||
    undefined
  );
}

export function getGeminiClient(apiKey?: string) {
  const key = resolveGeminiApiKey(apiKey);
  if (!key) {
    throw Object.assign(
      new Error(
        "No Gemini API key provided. Add one in API Key Settings or set GEMINI_API_KEY / AI_INTEGRATIONS_GEMINI_API_KEY on the server.",
      ),
      { status: 401 },
    );
  }
  return new GoogleGenAI({ apiKey: key });
}

// Legacy compatibility export. It still requires a user-provided key at call sites.
export const ai = {
  get models() {
    return getGeminiClient().models;
  },
};
