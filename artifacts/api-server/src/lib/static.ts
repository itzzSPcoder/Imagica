import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";
import { logger } from "./logger";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function resolveStaticRoot(): string | null {
  const fromEnv = process.env.STATIC_ROOT?.trim();
  if (fromEnv && fs.existsSync(path.join(fromEnv, "index.html"))) {
    return fromEnv;
  }

  const candidates = [
    path.resolve(moduleDir, "../../../sketch-to-component/dist/public"),
    path.resolve(process.cwd(), "artifacts/sketch-to-component/dist/public"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

export function attachStaticHosting(app: Express): void {
  if (process.env.SERVE_STATIC !== "true") return;

  const staticRoot = resolveStaticRoot();
  if (!staticRoot) {
    logger.warn("SERVE_STATIC is enabled but frontend build was not found");
    return;
  }

  logger.info({ staticRoot }, "Serving Imagica frontend");

  app.use(
    express.static(staticRoot, {
      index: false,
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }),
  );

  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    res.sendFile(path.join(staticRoot, "index.html"));
  });
}
