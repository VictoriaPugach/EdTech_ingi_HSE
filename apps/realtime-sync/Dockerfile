# syntax=docker/dockerfile:1
# =============================================================================
#  Realtime Sync (BC-1) — Node.js + ws + Yjs
#  Multi-stage. Контекст сборки — корень монорепо.
# =============================================================================

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/realtime-sync/package.json apps/realtime-sync/
RUN --mount=type=cache,target=/root/.npm \
    npm install --workspaces --include-workspace-root --no-audit --no-fund

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/realtime-sync ./apps/realtime-sync
WORKDIR /app/apps/realtime-sync
EXPOSE 4001
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/realtime-sync ./apps/realtime-sync
WORKDIR /app/apps/realtime-sync
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/realtime-sync/dist ./apps/realtime-sync/dist
COPY --from=build /app/apps/realtime-sync/package.json ./apps/realtime-sync/
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/apps/realtime-sync
EXPOSE 4001
CMD ["node", "dist/index.js"]
