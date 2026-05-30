import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sketchesTable = pgTable("sketches", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageDataUrl: text("image_data_url").notNull(),
  generatedCode: text("generated_code").notNull(),
  framework: text("framework").notNull().default("react-tailwind"),
  instructions: text("instructions"),
  analysis: text("analysis"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  tokensSaved: integer("tokens_saved").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSketchSchema = createInsertSchema(sketchesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSketch = z.infer<typeof insertSketchSchema>;
export type Sketch = typeof sketchesTable.$inferSelect;
