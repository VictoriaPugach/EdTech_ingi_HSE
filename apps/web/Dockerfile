# =============================================================================
#  Web SPA — React + Vite
#  Dev: vite dev server с HMR.
#  Prod: статика, nginx (для prod-стека позже).
# =============================================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

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
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
