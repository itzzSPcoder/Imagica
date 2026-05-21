import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, sketchesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  CreateSketchBody,
  GetSketchParams,
  DeleteSketchParams,
  RegenerateSketchParams,
  RegenerateSketchBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function buildPrompt(framework: string, instructions?: string | null): string {
  const frameworkDesc: Record<string, string> = {
    "react-tailwind": "React functional component using Tailwind CSS utility classes",
    "react-shadcn": "React functional component using shadcn/ui components and Tailwind CSS",
    "html-tailwind": "plain HTML with Tailwind CSS classes (no React)",
  };

  const desc = frameworkDesc[framework] ?? frameworkDesc["react-tailwind"];

  let prompt = `You are an expert frontend developer specializing in converting hand-drawn UI sketches into production-ready code.

Analyze this hand-drawn UI sketch carefully and generate a ${desc} that faithfully reproduces the layout and UI elements you observe.

Rules:
- Identify all UI elements: buttons, inputs, text fields, labels, images, navigation, cards, modals, etc.
- Reproduce the layout structure accurately (grid, flex, columns, rows)
- Use realistic placeholder text and data
- Make the component fully self-contained and functional
- Apply good design defaults and proper spacing
- Output ONLY the code — no explanations, no markdown fences, no imports header comments
- Start directly with the component/HTML code`;

  if (instructions) {
    prompt += `\n\nAdditional instructions from the user: ${instructions}`;
  }

  return prompt;
}

async function generateCodeFromImage(
  imageDataUrl: string,
  framework: string,
  instructions?: string | null,
): Promise<string> {
  const base64Match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid image data URL format");
  }
  const mimeType = base64Match[1];
  const base64Data = base64Match[2];

  const prompt = buildPrompt(framework, instructions);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
  });

  const text = response.text ?? "";
  // Strip markdown code fences if model included them
  return text
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
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
  const recentCount = all.filter((s) => s.createdAt >= oneDayAgo).length;

  res.json({ total, byFramework, recentCount });
});

router.post("/sketches", async (req, res): Promise<void> => {
  const parsed = CreateSketchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, imageDataUrl, framework, instructions } = parsed.data;

  req.log.info({ framework }, "Generating code from sketch");

  let generatedCode: string;
  try {
    generatedCode = await generateCodeFromImage(imageDataUrl, framework, instructions);
  } catch (err) {
    req.log.error({ err }, "Gemini generation failed");
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
    })
    .returning();

  res.status(201).json(sketch);
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

  res.json(sketch);
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

  req.log.info({ id: params.data.id, framework }, "Regenerating sketch code");

  let generatedCode: string;
  try {
    generatedCode = await generateCodeFromImage(existing.imageDataUrl, framework, instructions);
  } catch (err) {
    req.log.error({ err }, "Gemini regeneration failed");
    res.status(500).json({ error: "Failed to regenerate code" });
    return;
  }

  const [updated] = await db
    .update(sketchesTable)
    .set({ generatedCode, framework, instructions: instructions ?? null })
    .where(eq(sketchesTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
