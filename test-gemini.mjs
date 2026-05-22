import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI();
async function run() {
  try {
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [{ text: "hi" }]
            }
        ],
        config: { maxOutputTokens: 65536 }
    });
    for await (const chunk of stream) {
        console.log(chunk.text);
    }
  } catch(e) {
    console.error(e);
  }
}
run();