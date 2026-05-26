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
  const isReact = framework !== "html-tailwind" && framework !== "mern-stack";
  const isShadcn = framework === "react-shadcn";
  const isMern = framework === "mern-stack";

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

  let prompt: string;

  if (!isReact) {
    // ── HTML + Tailwind ──────────────────────────────────────────────────────
    prompt = `You are a world-class expert frontend developer and visual designer. Convert the hand-drawn UI sketch in this image into a complete, working, visually stunning HTML file styled with Tailwind CSS.

OUTPUT RULES — read every rule carefully:
1. Output ONLY raw code. No explanations, no markdown, no code fences (\`\`\`).
2. Start the very first character with <!DOCTYPE html> and end with </html>. Nothing before or after.
3. The file must be a complete, self-contained HTML document that opens in a browser without any build step.
4. Include <script src="https://cdn.tailwindcss.com"></script> in <head>.
5. Reproduce every visible UI element from the sketch: buttons, inputs, labels, nav, cards, tables, icons (use beautiful SVG icons or Unicode characters).
6. Replicate the layout structure accurately using Tailwind flex/grid utilities.
7. Use realistic placeholder text and data.
8. Every opened HTML tag must be properly closed. Self-closing tags (input, img, br, hr) must use correct HTML5 syntax.
9. The document must be visually complete — do NOT truncate or omit any section.

${aestheticsAndImagesGuide}`;
  } else if (isShadcn) {
    // ── React + shadcn/ui ────────────────────────────────────────────────────
    prompt = `You are a world-class expert React/TypeScript frontend developer and designer. Convert the hand-drawn UI sketch in this image into a complete, gorgeous React TSX component using shadcn/ui and Tailwind CSS.

OUTPUT RULES — read every rule carefully:
1. Output ONLY raw TSX code. No explanations, no markdown, no code fences (\`\`\`).
2. The very first line must be an import statement. The very last line must be: export default ComponentName;
3. Import ONLY from these available packages:
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
4. DO NOT import from any other package. If you need an icon not in lucide-react, use an inline SVG instead.
5. DO NOT use imaginary imports like "@/lib/utils", "@/hooks/...", or any component not listed above.
6. The component must be a single named function. Give it a clear PascalCase name matching the sketch content.
7. Reproduce every visible UI element from the sketch: buttons, inputs, nav, cards, lists, tables, modals, etc.
8. Replicate the layout accurately with Tailwind utility classes (flex, grid, gap, padding, etc.).
9. Use realistic placeholder text and data. For interactive elements, wire up useState where it makes the UI feel live and responsive.
10. Every JSX tag must be properly closed. Every opened { must have a matching }.
11. The component must be COMPLETE. Do NOT truncate any section. Do NOT cut any SVG path midway.
12. Every inline SVG must have all path d attributes fully written out — no "..." or partial paths.
13. The return statement must close with ); and the function with } before the export line.
14. VERIFY before finalising: all opening tags have closing tags, no syntax errors, the component compiles.

${aestheticsAndImagesGuide}`;
  } else if (isMern) {
    // ── Full-Stack MERN ──────────────────────────────────────────────────────
    prompt = `You are a world-class expert full-stack MERN developer. Convert the hand-drawn UI sketch in this image into a COMPLETE full-stack MERN application bundle.

OUTPUT RULES — read every rule carefully:
1. Output ONLY raw code. No explanations, no markdown fences.
2. Output ALL files separated by a clear comment banner like:
   // ===== FILE: filename.ext =====
3. Generate these files:
   a) React frontend component (App.tsx) using React + Tailwind CSS utility classes.
   b) Express.js API server (server.js) with relevant REST routes (GET, POST, PUT, DELETE) matching the UI's data.
   c) Mongoose schema/model file (models/Model.js) if the UI shows forms, lists, or data tables.
   d) A brief package.json with the necessary dependencies listed.
4. The React component MUST be a single self-contained TSX function. Import only from "react".
5. Style the React component with Tailwind CSS utility classes only.
6. Use realistic placeholder data, wire up useState for interactive elements.
7. The Express server should use cors and express.json middleware.
8. Every file must be COMPLETE — do NOT truncate.
9. VERIFY: all tags closed, all braces balanced.

${aestheticsAndImagesGuide}`;
  } else {
    // ── React + Tailwind ─────────────────────────────────────────────────────
    prompt = `You are a world-class expert React/TypeScript frontend developer and designer. Convert the hand-drawn UI sketch in this image into a complete, gorgeous React TSX component using only React and Tailwind CSS utility classes.

OUTPUT RULES — read every rule carefully:
1. Output ONLY raw TSX code. No explanations, no markdown, no code fences (\`\`\`).
2. The very first line must be an import statement. The very last line must be: export default ComponentName;
3. Import ONLY from these available packages:
   - "react" (useState, useEffect, useRef, useCallback, etc.)
   - DO NOT import from any other package.
4. Do NOT use lucide-react, shadcn/ui, or any third-party component library.
5. For icons: use inline SVG elements with complete, valid path data. Never truncate SVG paths.
6. Style EVERYTHING with Tailwind CSS utility classes only (no inline style objects, no CSS files).
7. The component must be a single named function. Give it a clear PascalCase name matching the sketch content.
8. Reproduce every visible UI element from the sketch: buttons, inputs, nav, cards, lists, tables, etc.
9. Replicate the layout accurately with Tailwind utility classes (flex, grid, gap, padding, etc.).
10. Use realistic placeholder text and data. For interactive elements, wire up useState where it makes the UI feel live and responsive.
11. Every JSX tag must be properly closed. Every opened { must have a matching }.
12. The component must be COMPLETE. Do NOT truncate any section, omit closing tags, or leave any block unfinished.
13. Every inline SVG must have all path d attributes fully written out — no "..." or partial paths.
14. The return statement must close with ); and the function with } before the export line.
15. VERIFY before finalising: all JSX tags are closed, all braces are balanced, no syntax errors.

${aestheticsAndImagesGuide}`;
  }

  if (instructions) {
    prompt += `\n\nAdditional instructions from the user: ${instructions}`;
  }

  return prompt;
}

async function generateCodeFromImage(
  imageDataUrl: string,
  framework: string,
  instructions?: string | null,
  apiKey?: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<string> {
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
      // Strip ALL markdown code fences the model may have wrapped the output in
      return text
        .replace(/^```[a-zA-Z]*\s*/m, "")   // opening fence like ```tsx or ```html
        .replace(/\s*```\s*$/m, "")          // closing fence
        .trim();
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

  // Keep generation to a single Gemini request. Running analysis as a second
  // parallel request burns quota quickly on free-tier keys.
  let generatedCode: string;
  let analysis: Awaited<ReturnType<typeof analyzeSketchElements>> = {
    elements: [],
    layout: "Generated from uploaded sketch",
    colorScheme: "unknown",
    complexity: "unknown",
  };
  try {
    generatedCode = await generateCodeFromImage(
      imageDataUrl,
      framework,
      instructions,
      userApiKey,
      model,
    );
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
  const analysisResult = {
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

  res.write(`data: ${JSON.stringify({ type: "analysis", analysis: analysisResult })}\n\n`);

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

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            fullCode += text;
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
          "Gemini model quota hit in generation stream, trying fallback model",
        );
      }
    }

    if (!success) {
      throw lastError;
    }

    // Clean up code markdown fences
    const cleanCode = fullCode
      .replace(/^```[a-zA-Z]*\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    // Save final code and analysis to the DB
    await db
      .update(sketchesTable)
      .set({
        generatedCode: cleanCode,
        analysis: JSON.stringify(analysisResult),
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
