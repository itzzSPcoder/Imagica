import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, sketchesTable, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { getGeminiClient } from "@workspace/integrations-gemini-ai";
import {
  CreateSketchBody,
  GetSketchParams,
  DeleteSketchParams,
  RegenerateSketchParams,
  RegenerateSketchBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
const GEMINI_MODELS = new Set(GEMINI_MODEL_FALLBACKS);

function getGeminiModel(req: { headers: Record<string, unknown>; query?: Record<string, unknown> }) {
  const rawModel = req.headers["x-gemini-model"] || req.query?.model;
  const model = Array.isArray(rawModel) ? rawModel[0] : rawModel;
  return typeof model === "string" && GEMINI_MODELS.has(model)
    ? model
    : DEFAULT_GEMINI_MODEL;
}

function orderedGeminiModels(preferredModel: string) {
  return [
    preferredModel,
    ...GEMINI_MODEL_FALLBACKS.filter((model) => model !== preferredModel),
  ];
}

function getGeminiErrorMessage(err: any): string {
  const status = err?.status ?? err?.statusCode ?? 0;
  const rawMessage = typeof err?.message === "string" ? err.message : "";
  let message = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage);
    message = parsed?.error?.message || message;
  } catch {
    // Gemini SDK sometimes exposes plain text, sometimes serialized JSON.
  }

  if (status === 429) {
    return `This Gemini API key or Google Cloud project has hit quota for the selected model. Try another model from Active AI Model, use a key from a different project, or wait for quota reset. ${message}`;
  }

  if (status === 400 && message.toLowerCase().includes("api key")) {
    return "The Gemini API key is invalid. Create a new key in Google AI Studio and paste only the key text, starting with AIza.";
  }

  if (status === 401) {
    return "No Gemini API key was provided. Add one in API Key Settings.";
  }

  return message || "Failed to generate code from sketch";
}

/**
 * Retry helper with exponential backoff for transient Gemini API errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.statusCode ?? 0;
      const isRetryable = status === 503 || status === 429 || status === 408;
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn(
        { attempt: attempt + 1, maxRetries, delayMs: delay, status },
        "Gemini API transient error, retrying...",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function buildPrompt(framework: string, instructions?: string | null): string {
  let friendlyFramework = "React + Tailwind";
  if (framework === "html-tailwind") {
    friendlyFramework = "plain HTML/CSS";
  } else if (framework === "react-shadcn") {
    friendlyFramework = "React + Tailwind (with shadcn/ui components)";
  } else if (framework === "mern-stack") {
    friendlyFramework = "MERN Fullstack";
  }

  const aestheticsAndImagesGuide = `
VISUAL DESIGN & AESTHETICS RULES (MAKE IT A 'DASHING COOL UI'):
1. NEVER output basic, plain, or boring layouts. Create breathtaking, high-end, premium, and futuristic UIs that "WOW" the user at first glance.
2. Rich Themes & Gradients: Use deep, elegant dark modes (e.g. background gradient bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950) or modern glassmorphic light themes. Use vibrant background gradients, text gradients (e.g. bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400), and colorful button gradients.
3. Glassmorphism: Add depth using frosted glass containers (e.g. backdrop-blur-md bg-white/5 border border-white/10 for dark mode, or bg-slate-900/40 border border-slate-800/50 for light mode).
4. Details & Shadows: Use generous padding, spacious layout gaps, highly rounded corners (rounded-2xl, rounded-3xl), and soft outer glowing drop shadows (shadow-2xl shadow-indigo-500/10).
5. Micro-Animations & Hover Effects: Every button, link, card, and interactive element MUST have silky-smooth transition effects (transition-all duration-300 ease-in-out) and tactile hover/active animations (e.g. hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg active:scale-95). Make inputs glow on focus.
6. Unicode/Inline SVGs: Use clean inline SVGs or unicode for gorgeous modern icons.

REAL WORKING MOCK IMAGES:
1. NEVER use empty src="", local file paths like "/avatar.png", "/profile.jpg", or placeholder.png. This breaks the live preview sandbox!
2. ALWAYS use real, high-resolution, working public image URLs from Unsplash. Curate your image choices based on context:
   - User/Team Profile Avatars:
     * Female 1: https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80
     * Female 2: https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80
     * Male 1: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80
     * Male 2: https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80
   - Modern Tech/SaaS Dashboards, Banners, and Breathtaking Backgrounds:
     * Analytics: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80
     * Workspace: https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80
     * Collaboration: https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80
   - Premium Product Showcase Cards:
     * Wireless Headphones: https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80
     * Sneakers: https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80
     * Watch: https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80
   - Generic Sizing Placeholders: If specific dimensions are required, use: https://placehold.co/WIDTHxHEIGHT/1e1b4b/ffffff?text=Label (use deep indigo color code 1e1b4b).`;

  let prompt = `You are an expert UI/UX analyst and full-stack developer. The user will give you a photo of a hand-drawn wireframe or UI sketch along with their preferred output framework: ${friendlyFramework}.

STEP 1 — ANALYZE THE SKETCH:
Carefully look at the image and identify:
- Screen type (login page, dashboard, landing page, profile, etc.)
- All UI components present (navbar, buttons, inputs, cards, modals, lists, images, etc.)
- Layout structure (how elements are arranged — rows, columns, sections)
- Visual hierarchy (what is the most important element on screen)

STEP 2 — OUTPUT A JSON SUMMARY (always first, before any code):
\`\`\`json
{
  "screen_type": "...",
  "components_detected": ["...", "..."],
  "layout": "...",
  "framework": "${friendlyFramework}"
}
\`\`\`

STEP 3 — GENERATE THE CODE:
Based on the analysis above, write clean production-ready code.

Rules for ALL frameworks:
- Use realistic placeholder content (not Lorem ipsum)
- Make it fully responsive
- Add short inline comments mapping code sections to the sketch
- Output ONLY the code block after the JSON — no extra explanation

`;

  if (framework === "react-tailwind" || framework === "react-shadcn") {
    const isShadcn = framework === "react-shadcn";
    prompt += `If framework is React + Tailwind:
- Functional component with hooks
- Tailwind utility classes only, no custom CSS
- Use shadcn/ui components (Button, Input, Card) where suitable
- Single default export named after the screen type

STUBS & COMPONENT IMPORTS GUIDE:
You can import ONLY from these packages:
- "react" (useState, useEffect, useRef, useCallback, etc.)
- "@/components/ui/button" → { Button }
- "@/components/ui/input" → { Input }
- "@/components/ui/card" → { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter }
- "@/components/ui/badge" → { Badge }
- "@/components/ui/separator" → { Separator }
- "@/components/ui/label" → { Label }
- "@/components/ui/textarea" → { Textarea }
- "@/components/ui/select" → { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
- "@/components/ui/avatar" → { Avatar, AvatarImage, AvatarFallback }
- "@/components/ui/tabs" → { Tabs, TabsContent, TabsList, TabsTrigger }
- "@/components/ui/progress" → { Progress }
- "@/components/ui/checkbox" → { Checkbox }
- "@/components/ui/switch" → { Switch }
- "lucide-react" (any icon from lucide-react)

${isShadcn ? 'DO NOT import from any other package. If you need an icon not in lucide-react, use an inline SVG instead.' : 'DO NOT use lucide-react, shadcn/ui, or any third-party component library. Use inline SVGs with complete, valid path data.'}

Ensure the component is a single named function with a default export at the end: export default ComponentName;
Do NOT truncate any sections, omit closing tags, or leave any block unfinished.

${aestheticsAndImagesGuide}`;
  } else if (framework === "html-tailwind") {
    prompt += `If framework is plain HTML/CSS:
- Semantic HTML5 tags
- CSS Flexbox/Grid for layout
- Use Tailwind CSS by including <script src="https://cdn.tailwindcss.com"></script> in <head>
- CSS variables in :root for colors
- Mobile-first with media queries

Ensure to output the complete HTML document starting with <!DOCTYPE html> and ending with </html>.
Do NOT truncate, omit sections, or leave any tag unfinished.

${aestheticsAndImagesGuide}`;
  } else if (framework === "mern-stack") {
    prompt += `If framework is MERN Fullstack:
- Output React App.tsx using React + Tailwind utility classes
- Output Express.js server.js with CORS, express.json, and REST routes
- Use Mongoose schema models/Model.js if forms or lists exist
- Keep all files separated by clear comment headers like: // ===== FILE: filename.ext =====
- Do NOT truncate. Ensure files are complete and syntactically balanced.

${aestheticsAndImagesGuide}`;
  }

  prompt += `

STEP 4 — EDIT MODE (if user says "change...", "update...", or "make it..."):
The user wants to modify previously generated code.
- Apply only the requested change
- Keep everything else exactly the same
- Output the full updated code — no explanation needed

Default framework if not specified: React + Tailwind`;

  if (instructions) {
    prompt += `\n\nAdditional instructions from the user: ${instructions}`;
  }

  return prompt;
}

interface ParsedResult {
  analysis: {
    elements: { type: string; label: string; count?: number }[];
    layout: string;
    colorScheme: string;
    complexity: string;
  };
  code: string;
}

function parseGeminiResponse(rawText: string, framework: string): ParsedResult {
  const text = rawText.trim();
  let jsonStr = "";
  let remainingText = text;

  // Check if there is a '{' near the start of the response. If not, this is already pure code
  const firstBraceIndex = text.indexOf("{");
  const isJsonProposed = firstBraceIndex !== -1 && firstBraceIndex < 120; // Allow 120 margin for markdown code fence headers

  if (!isJsonProposed) {
    return {
      analysis: {
        elements: [],
        layout: "Generated from uploaded sketch",
        colorScheme: "unknown",
        complexity: "medium",
      },
      code: text,
    };
  }

  // Try to find a JSON block wrapped in ```json ... ```
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
    remainingText = text.replace(jsonMatch[0], "").trim();
  } else {
    // If not wrapped in ```json, look for the first balanced curly braces
    if (firstBraceIndex !== -1) {
      let braceCount = 0;
      let endBraceIndex = -1;
      for (let i = firstBraceIndex; i < text.length; i++) {
        if (text[i] === "{") braceCount++;
        else if (text[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            endBraceIndex = i;
            break;
          }
        }
      }
      if (endBraceIndex !== -1) {
        jsonStr = text.substring(firstBraceIndex, endBraceIndex + 1).trim();
        remainingText = text.substring(endBraceIndex + 1).trim();
      }
    }
  }

  let screenType = "unknown";
  let componentsDetected: string[] = [];
  let layout = "Generated from uploaded sketch";
  let colorScheme = "unknown";
  let complexity = "medium";

  if (jsonStr) {
    try {
      const parsedJson = JSON.parse(jsonStr);
      screenType = parsedJson.screen_type || screenType;
      componentsDetected = parsedJson.components_detected || [];
      layout = parsedJson.layout || layout;
      colorScheme = parsedJson.color_scheme || parsedJson.colors || "Material Dark";
      complexity = parsedJson.complexity || (componentsDetected.length > 8 ? "high" : componentsDetected.length > 4 ? "medium" : "low");
    } catch (e) {
      logger.warn({ err: e, jsonStr }, "Failed to parse JSON summary from Gemini response");
    }
  }

  // Convert friendly components_detected list to the elements array expected by the frontend
  const elements = componentsDetected.map((comp) => {
    let type = "card";
    const lower = comp.toLowerCase();
    if (lower.includes("button") || lower.includes("btn")) type = "button";
    else if (lower.includes("input") || lower.includes("field") || lower.includes("text")) type = "input";
    else if (lower.includes("nav") || lower.includes("header")) type = "navbar";
    else if (lower.includes("sidebar")) type = "sidebar";
    else if (lower.includes("footer")) type = "footer";
    else if (lower.includes("avatar") || lower.includes("profile")) type = "avatar";
    else if (lower.includes("image") || lower.includes("pic") || lower.includes("img")) type = "image";
    else if (lower.includes("card")) type = "card";
    else if (lower.includes("table")) type = "table";
    else if (lower.includes("list")) type = "list";
    else if (lower.includes("modal") || lower.includes("dialog")) type = "modal";
    else if (lower.includes("icon")) type = "icon";
    else if (lower.includes("badge")) type = "badge";
    else if (lower.includes("tab")) type = "tab";
    else if (lower.includes("search")) type = "search";
    else if (lower.includes("dropdown") || lower.includes("select")) type = "dropdown";

    return { type, label: comp, count: 1 };
  });

  // Extract the code block from the remaining text
  let code = remainingText.trim();
  const codeBlockMatch = code.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim();
  } else {
    code = code
      .replace(/^```[a-zA-Z]*\s*/gm, "")
      .replace(/\s*```\s*$/gm, "")
      .trim();
  }

  return {
    analysis: {
      elements,
      layout,
      colorScheme,
      complexity,
    },
    code,
  };
}

async function generateCodeFromImage(
  imageDataUrl: string,
  framework: string,
  instructions?: string | null,
  apiKey?: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<{ code: string; analysis: any }> {
  const base64Match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid image data URL format");
  }
  const mimeType = base64Match[1];
  const base64Data = base64Match[2];

  const prompt = buildPrompt(framework, instructions);
  const client = getGeminiClient(apiKey);
  let lastError: any;

  for (const candidateModel of orderedGeminiModels(model)) {
    try {
      const response = await withRetry(() =>
        client.models.generateContent({
          model: candidateModel,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: { maxOutputTokens: 8192 },
        })
      );

      const text = response.text ?? "";
      return parseGeminiResponse(text, framework);
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.statusCode ?? 0;
      if (status !== 429) {
        throw err;
      }
      logger.warn(
        { model: candidateModel },
        "Gemini model quota hit, trying fallback model",
      );
    }
  }

  throw lastError;
}

/**
 * Analyze the sketch image to identify UI elements before generating code.
 * Returns structured JSON describing detected components.
 */
async function analyzeSketchElements(
  imageDataUrl: string,
  apiKey?: string,
): Promise<{
  elements: { type: string; label: string; count?: number }[];
  layout: string;
  colorScheme: string;
  complexity: string;
}> {
  const base64Match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    return { elements: [], layout: "unknown", colorScheme: "unknown", complexity: "unknown" };
  }
  const mimeType = base64Match[1];
  const base64Data = base64Match[2];

  const prompt = `Analyze this hand-drawn UI sketch image. Identify all UI elements, layout structure, and design intent.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "elements": [
    { "type": "button", "label": "description of the button", "count": 2 },
    { "type": "input", "label": "text input field", "count": 1 },
    { "type": "navbar", "label": "top navigation bar", "count": 1 }
  ],
  "layout": "A brief description of the overall layout structure (e.g. 'Two-column layout with sidebar and main content area')",
  "colorScheme": "Inferred color scheme intent (e.g. 'dark mode', 'light with blue accents', 'neutral')",
  "complexity": "low | medium | high"
}

Common element types to detect: button, input, textarea, select, checkbox, radio, toggle, navbar, sidebar, header, footer, card, table, list, modal, image, avatar, icon, badge, tab, form, chart, search, dropdown, link, divider, progress-bar, slider, calendar, notification.

Be thorough — identify EVERY element you can see in the sketch.`;

  const client = getGeminiClient(apiKey);

  try {
    const response = await withRetry(() =>
      client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt },
            ],
          },
        ],
        config: { maxOutputTokens: 2048 },
      })
    );

    const text = (response.text ?? "")
      .replace(/^```[a-zA-Z]*\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    return JSON.parse(text);
  } catch (err) {
    logger.warn({ err }, "Sketch analysis failed, continuing without analysis");
    return { elements: [], layout: "unknown", colorScheme: "unknown", complexity: "unknown" };
  }
}

router.get("/sketches", async (req, res): Promise<void> => {
  const sketches = await db
    .select()
    .from(sketchesTable)
    .orderBy(desc(sketchesTable.createdAt));
  res.json(sketches);
});

router.get("/sketches/stats", async (req, res): Promise<void> => {
  const all = await db.select().from(sketchesTable);
  const total = all.length;

  const byFramework: Record<string, number> = {};
  for (const s of all) {
    byFramework[s.framework] = (byFramework[s.framework] ?? 0) + 1;
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = all.filter((s: { createdAt: Date }) => s.createdAt >= oneDayAgo).length;

  res.json({ total, byFramework, recentCount });
});

router.post("/sketches", async (req, res): Promise<void> => {
  const parsed = CreateSketchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, imageDataUrl, framework, instructions } = parsed.data;
  const model = getGeminiModel(req);

  req.log.info({ framework, model }, "Analyzing sketch and generating code");

  const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;

  let generatedCode: string = "";
  let analysis: any = {
    elements: [],
    layout: "Generated from uploaded sketch",
    colorScheme: "unknown",
    complexity: "unknown",
  };
  try {
    const result = await generateCodeFromImage(
      imageDataUrl,
      framework,
      instructions,
      userApiKey,
      model,
    );
    generatedCode = result.code;
    analysis = result.analysis;
  } catch (err: any) {
    req.log.error({ err }, "Gemini generation failed");
    const status = err?.status ?? err?.statusCode ?? 0;
    if (status === 429) {
      res.status(429).json({ error: getGeminiErrorMessage(err) });
      return;
    } else if (status === 503) {
      res.status(503).json({ error: "Gemini is currently overloaded. Please try again later." });
      return;
    } else if (status === 400 || status === 401) {
      res.status(status).json({ error: getGeminiErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: "Failed to generate code from sketch" });
    return;
  }

  const [sketch] = await db
    .insert(sketchesTable)
    .values({
      title,
      imageDataUrl,
      generatedCode,
      framework,
      instructions: instructions ?? null,
      analysis: JSON.stringify(analysis),
    })
    .returning();

  // Return sketch + AI analysis data for the frontend to display
  res.status(201).json({ ...sketch, analysis });
});

router.get("/sketches/:id/stream", async (req, res): Promise<void> => {
  const params = GetSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sketch] = await db
    .select()
    .from(sketchesTable)
    .where(eq(sketchesTable.id, params.data.id));

  if (!sketch) {
    res.status(404).json({ error: "Sketch not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // If code is already generated, send it immediately and close
  if (sketch.generatedCode) {
    let parsedAnalysis = null;
    if (sketch.analysis) {
      try {
        parsedAnalysis = JSON.parse(sketch.analysis);
      } catch (e) {
        req.log.warn({ err: e }, "Failed to parse analysis");
      }
    }
    res.write(`data: ${JSON.stringify({ type: "analysis", analysis: parsedAnalysis })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "chunk", content: sketch.generatedCode })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  }

  req.log.info({ id: sketch.id }, "Starting real-time code generation stream");

  let fullCode = "";
  let streamedAnalysis: any = {
    elements: [],
    layout: "Generated from uploaded sketch",
    colorScheme: "unknown",
    complexity: "unknown",
  };

  const base64Match = sketch.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    res.write(`data: ${JSON.stringify({ type: "error", message: "Invalid image format" })}\n\n`);
    res.end();
    return;
  }
  const mimeType = base64Match[1];
  const base64Data = base64Match[2];

  const userApiKey = (req.headers["x-gemini-api-key"] || req.query.apiKey) as string | undefined;
  const model = getGeminiModel(req);
  const client = getGeminiClient(userApiKey);

  let lastError: any;
  let success = false;

  try {
    const prompt = buildPrompt(sketch.framework, sketch.instructions);

    for (const candidateModel of orderedGeminiModels(model)) {
      try {
        fullCode = ""; // Reset in case of fallback retry
        const stream = await withRetry(() =>
          client.models.generateContentStream({
            model: candidateModel,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType, data: base64Data } },
                  { text: prompt },
                ],
              },
            ],
            config: { maxOutputTokens: 8192 },
          }),
        );

        let buffer = "";
        let jsonParsed = false;

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            if (!jsonParsed) {
              buffer += text;
              const jsonEndIndex = buffer.indexOf("}");
              if (jsonEndIndex !== -1) {
                let braceCount = 0;
                let foundEnd = -1;
                for (let i = 0; i < buffer.length; i++) {
                  if (buffer[i] === "{") braceCount++;
                  else if (buffer[i] === "}") {
                    braceCount--;
                    if (braceCount === 0) {
                      foundEnd = i;
                      break;
                    }
                  }
                }

                if (foundEnd !== -1) {
                  const jsonPart = buffer.substring(0, foundEnd + 1);
                  const parsed = parseGeminiResponse(jsonPart, sketch.framework);
                  streamedAnalysis = parsed.analysis;
                  res.write(`data: ${JSON.stringify({ type: "analysis", analysis: parsed.analysis })}\n\n`);
                  
                  let remaining = buffer.substring(foundEnd + 1).trim();
                  remaining = remaining.replace(/^```[a-zA-Z]*\s*\n?/m, "").trim();
                  if (remaining) {
                    fullCode += remaining;
                    res.write(`data: ${JSON.stringify({ type: "chunk", content: remaining })}\n\n`);
                  }
                  jsonParsed = true;
                  buffer = "";
                }
              }
            } else {
              let cleanText = text;
              if (fullCode === "" && cleanText.startsWith("```")) {
                cleanText = cleanText.replace(/^```[a-zA-Z]*\s*\n?/m, "");
              }
              if (cleanText.endsWith("```")) {
                cleanText = cleanText.substring(0, cleanText.length - 3).trim();
              }
              fullCode += cleanText;
              res.write(`data: ${JSON.stringify({ type: "chunk", content: cleanText })}\n\n`);
            }
          }
        }

        if (!jsonParsed) {
          const parsed = parseGeminiResponse(buffer, sketch.framework);
          streamedAnalysis = parsed.analysis;
          res.write(`data: ${JSON.stringify({ type: "analysis", analysis: parsed.analysis })}\n\n`);
          fullCode = parsed.code;
          res.write(`data: ${JSON.stringify({ type: "chunk", content: parsed.code })}\n\n`);
        }

        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        const status = err?.status ?? err?.statusCode ?? 0;
        if (status !== 429) {
          throw err;
        }
        req.log.warn(
          { model: candidateModel, err: err?.message || err },
          "Gemini model quota hit in generation stream, trying fallback model",
        );
      }
    }

    if (!success) {
      throw lastError;
    }

    // Save final code and analysis directly to DB, avoiding double parsing
    await db
      .update(sketchesTable)
      .set({
        generatedCode: fullCode.trim(),
        analysis: JSON.stringify(streamedAnalysis),
      })
      .where(eq(sketchesTable.id, sketch.id));

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err: any) {
    req.log.error({ err }, "Gemini streaming generation failed");
    const status = err?.status ?? err?.statusCode ?? 0;
    const userMessage =
      status === 503
        ? "Gemini is experiencing high demand. Please try again in a few seconds."
        : status === 429
          ? "Rate limit reached. Please wait a moment and try again."
          : "Generation failed. Please try again.";
    res.write(`data: ${JSON.stringify({ type: "error", message: userMessage })}\n\n`);
  } finally {
    res.end();
  }
});

router.post("/sketches/:id/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RegenerateSketchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(sketchesTable)
    .where(eq(sketchesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Sketch not found" });
    return;
  }

  const framework = parsed.data.framework ?? existing.framework;
  const instructions = parsed.data.instructions ?? existing.instructions;

  const [updated] = await db
    .update(sketchesTable)
    .set({
      generatedCode: "", // Clear code to trigger streaming
      framework,
      instructions: instructions ?? null,
    })
    .where(eq(sketchesTable.id, params.data.id))
    .returning();

  let parsedAnalysis = null;
  if (updated.analysis) {
    try {
      parsedAnalysis = JSON.parse(updated.analysis);
    } catch (e) {
      req.log.warn({ err: e }, "Failed to parse analysis JSON from DB");
    }
  }

  res.json({ ...updated, analysis: parsedAnalysis });
});

router.get("/sketches/:id/messages", async (req, res): Promise<void> => {
  const params = GetSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const convTitle = `sketch-${params.data.id}`;
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.title, convTitle));

  if (!conversation) {
    res.json([]);
    return;
  }

  const sketchMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(messagesTable.createdAt);

  res.json(sketchMessages);
});

router.get("/sketches/:id/refine", async (req, res): Promise<void> => {
  const params = GetSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messageText = req.query.message as string;
  if (!messageText) {
    res.status(400).json({ error: "Missing message query parameter" });
    return;
  }

  const [sketch] = await db
    .select()
    .from(sketchesTable)
    .where(eq(sketchesTable.id, params.data.id));

  if (!sketch) {
    res.status(404).json({ error: "Sketch not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  req.log.info({ id: sketch.id }, "Starting real-time code refinement stream");

  const convTitle = `sketch-${sketch.id}`;
  let [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.title, convTitle));

  if (!conversation) {
    [conversation] = await db
      .insert(conversationsTable)
      .values({ title: convTitle })
      .returning();
  }

  await db.insert(messagesTable).values({
    conversationId: conversation.id,
    role: "user",
    content: messageText,
  });

  const previousMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(messagesTable.createdAt);

  const base64Match = sketch.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    res.write(`data: ${JSON.stringify({ type: "error", message: "Invalid image format" })}\n\n`);
    res.end();
    return;
  }
  const mimeType = base64Match[1];
  const base64Data = base64Match[2];

  const aestheticsRules = buildPrompt(sketch.framework, sketch.instructions);

  const conversationHistoryText = previousMessages
    .map((m: { role: string; content: string }) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n");

  const refinementPrompt = `You are a world-class expert frontend developer and visual designer.
You are refining a previously generated component/code block according to the user's request.

Here is the CURRENT working code:
\`\`\`
${sketch.generatedCode}
\`\`\`

Here is the conversation history of refinement requests and instructions:
${conversationHistoryText}

YOUR TASK:
Refine the code based on the latest request: "${messageText}".
Ensure you follow the same framework (${sketch.framework}) rules and guidelines:
${aestheticsRules}

Make sure to output the COMPLETE refined code. Never truncate, omit sections, or output partial code blocks.`;

  let refinedCode = "";
  const userApiKey = (req.headers["x-gemini-api-key"] || req.query.apiKey) as string | undefined;
  const model = getGeminiModel(req);
  const client = getGeminiClient(userApiKey);
  let lastError: any;
  let success = false;

  for (const candidateModel of orderedGeminiModels(model)) {
    try {
      refinedCode = ""; // Reset in case of fallback retry
      const stream = await withRetry(() =>
        client.models.generateContentStream({
          model: candidateModel,
          contents: [
            {
              role: "user",
              parts: [
                { text: refinementPrompt },
              ],
            },
          ],
          config: { maxOutputTokens: 8192 },
        }),
      );

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          refinedCode += text;
          res.write(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`);
        }
      }
      success = true;
      break;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.statusCode ?? 0;
      if (status !== 429) {
        throw err;
      }
      req.log.warn(
        { model: candidateModel, err: err?.message || err },
        "Gemini model quota hit in refinement stream, trying fallback model",
      );
    }
  }

  if (!success) {
    req.log.error({ err: lastError }, "Gemini refinement streaming failed after trying all models");
    const status = lastError?.status ?? lastError?.statusCode ?? 0;
    const userMessage =
      status === 503
        ? "Gemini is experiencing high demand. Please try again in a few seconds."
        : status === 429
          ? "Rate limit reached. Please wait a moment and try again."
          : "Refinement failed. Please try again.";
    res.write(`data: ${JSON.stringify({ type: "error", message: userMessage })}\n\n`);
    res.end();
    return;
  }

  try {
    const cleanRefinedCode = refinedCode
      .replace(/^```[a-zA-Z]*\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    await db
      .update(sketchesTable)
      .set({
        generatedCode: cleanRefinedCode,
      })
      .where(eq(sketchesTable.id, sketch.id));

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      role: "assistant",
      content: `Code refined successfully based on your request: "${messageText}".`,
    });

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err: any) {
    req.log.error({ err }, "Failed to save refined code to DB");
    res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to save refined code" })}\n\n`);
  } finally {
    res.end();
  }
});

router.get("/sketches/:id", async (req, res): Promise<void> => {
  const params = GetSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sketch] = await db
    .select()
    .from(sketchesTable)
    .where(eq(sketchesTable.id, params.data.id));

  if (!sketch) {
    res.status(404).json({ error: "Sketch not found" });
    return;
  }

  let parsedAnalysis = null;
  if (sketch.analysis) {
    try {
      parsedAnalysis = JSON.parse(sketch.analysis);
    } catch (e) {
      req.log.warn({ err: e }, "Failed to parse analysis JSON from DB");
    }
  }

  res.json({ ...sketch, analysis: parsedAnalysis });
});

router.delete("/sketches/:id", async (req, res): Promise<void> => {
  const params = DeleteSketchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sketch] = await db
    .delete(sketchesTable)
    .where(eq(sketchesTable.id, params.data.id))
    .returning();

  if (!sketch) {
    res.status(404).json({ error: "Sketch not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
