# Sketch to Component

A hackathon project that converts hand-drawn UI sketches into production-ready React + Tailwind CSS code using Gemini Vision AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/sketch-to-component run dev` — run the frontend (port 25383)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini AI (auto-provisioned via Replit AI Integrations)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter, shadcn/ui, Tailwind CSS, prism-react-renderer
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini Vision (gemini-2.5-flash) via Replit AI Integrations
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/sketches.ts` — Sketch table schema
- `lib/db/src/schema/conversations.ts`, `messages.ts` — Gemini chat schema
- `lib/integrations-gemini-ai/` — Gemini AI client + image/batch utils
- `artifacts/api-server/src/routes/sketches/` — Sketch-to-code route (calls Gemini Vision)
- `artifacts/api-server/src/routes/gemini/` — Gemini chat/image routes
- `artifacts/sketch-to-component/src/` — React frontend

## Architecture decisions

- Gemini Vision (gemini-2.5-flash) analyzes the uploaded sketch as an inline base64 image, no Files API needed
- The `/api/sketches` POST endpoint is synchronous JSON (not SSE) — Gemini is called server-side
- `@google/*` pattern removed from esbuild externals so `@google/genai` is bundled correctly
- Conversations and messages tables from the Gemini integration template are included for potential chat extension

## Product

- Upload a hand-drawn sketch (PNG/JPG/JPEG)
- Choose target framework: React + Tailwind, React + shadcn/ui, or plain HTML + Tailwind
- Optionally provide extra instructions (e.g., "use dark mode", "make it mobile-first")
- Gemini Vision analyzes the layout and generates code
- View generated code with syntax highlighting, copy to clipboard
- History page shows all past conversions
- Regenerate any sketch with different framework or instructions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Remove `@google/*` from the `external` list in `artifacts/api-server/build.mjs` — it's needed for bundling `@google/genai`
- Run `pnpm run typecheck:libs` after editing DB schema to rebuild composite lib declarations before typechecking the API server
- `conversations` and `messages` tables use bare names (not `conversationsTable`/`messagesTable`) — alias on import

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
