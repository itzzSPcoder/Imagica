# Imagica — production image (API + built frontend on one port)
FROM node:24-bookworm-slim AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/sketch-to-component run build
RUN pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim AS run

WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_STATIC=true
ENV PORT=8080

COPY --from=build /app /app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
