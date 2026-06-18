# syntax=docker/dockerfile:1
# =============================================================================
#  Web SPA — React + Vite
#  Dev: vite dev server с HMR.
#  Prod: статика, nginx (для prod-стека позже).
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
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm install --workspaces --include-workspace-root --no-audit --no-fund

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
# URL бэкенда/websocket вшиваются в бандл на этапе сборки (Vite).
# Для прод-домена передаются как build-args (см. deploy/docker-compose.prod.yml).
ARG VITE_API_URL=
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine AS prod
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
