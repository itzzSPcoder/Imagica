# Deploy Imagica to imagicasite.xyz

Imagica runs as **one web service**: Express API + React frontend on the same domain (`/api/*` + SPA).

## Quick deploy (Render — recommended)

1. Push this repo to GitHub (already: `itzzSPcoder/Imagica`).
2. Open [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) → connect **Imagica** repo.
3. Render reads `render.yaml` and creates the **imagica** web service.
4. Wait for the first deploy to finish. You get a URL like `https://imagica-xxxx.onrender.com`.
5. In Render → **imagica** → **Settings** → **Custom Domains** → add:
   - `imagicasite.xyz`
   - `www.imagicasite.xyz`
6. At your domain registrar (where you bought `imagicasite.xyz`), **remove** the parking DNS and set:

   | Type  | Name | Value |
   |-------|------|--------|
   | CNAME | `www` | *(copy from Render custom domain screen)* |
   | ALIAS or A | `@` | *(Render apex instructions — often A records to Render IPs)* |

7. Optional env vars in Render → **Environment**:
   - `GEMINI_API_KEY` — server default Gemini key
   - `DATABASE_URL` — [Neon](https://neon.tech) Postgres (recommended; without it, data is in-memory and resets on redeploy)

8. Open **https://imagicasite.xyz** — add your Gemini API key in the app if needed.

## DNS note

Right now `imagicasite.xyz` points to a **.xyz parking page** (`54.67.87.110`). You must change DNS to Render (or your host) for the real app to show.

## Local production test

```bash
pnpm install
pnpm --filter @workspace/sketch-to-component run build
pnpm --filter @workspace/api-server run build
$env:SERVE_STATIC="true"
$env:PORT="8080"
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Visit http://localhost:8080

## Docker

```bash
docker build -t imagica .
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key imagica
```
