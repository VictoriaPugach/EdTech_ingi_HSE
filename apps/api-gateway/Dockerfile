# syntax=docker/dockerfile:1
# =============================================================================
#  API Gateway (BC-3) — Node.js + Fastify + Prisma
#  Multi-stage: dev (с tsx watch) и prod (скомпилированный JS).
#  Контекст сборки — корень монорепо (нужен package-lock.json и shared-пакет).
# =============================================================================

# ---------- base ----------
# bookworm-slim: без Alpine/apk — меньше сбоев при нестабильном DNS к dl-cdn.alpinelinux.org
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---------- deps (общие для dev и prod) ----------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api-gateway/package.json apps/api-gateway/
RUN --mount=type=cache,target=/root/.npm \
    npm install --workspaces --include-workspace-root --no-audit --no-fund

# ---------- dev ----------
FROM base AS dev
ENV NODE_ENV=development
# npm workspaces поднимает зависимости в корень /app/node_modules; вложенных node_modules может не быть.
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api-gateway ./apps/api-gateway
WORKDIR /app/apps/api-gateway
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---------- build ----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api-gateway ./apps/api-gateway
WORKDIR /app/apps/api-gateway
RUN npx prisma generate && npm run build

# ---------- prod ----------
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=build /app/apps/api-gateway/prisma ./apps/api-gateway/prisma
COPY --from=build /app/apps/api-gateway/package.json ./apps/api-gateway/
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/apps/api-gateway
EXPOSE 4000
CMD ["node", "dist/index.js"]
