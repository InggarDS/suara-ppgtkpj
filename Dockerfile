# syntax=docker/dockerfile:1

# ---------- deps: full install (incl. dev) for the build ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- build: generate Prisma client + next build (standalone) ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts already emits output:"standalone" whenever VERCEL is unset
RUN npx prisma generate && npm run build

# ---------- proddeps: production-only node_modules ----------
# Keeps the full Prisma CLI dependency tree (prisma is a prod dep, so `effect`,
# @prisma/config, etc. come with it) while dropping eslint/typescript/tailwind.
# `postinstall` runs `prisma generate`, so the client + engines are platform-correct.
FROM node:20-bookworm-slim AS proddeps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# ---------- runner: non-root, standalone server + prod deps ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Prisma query engine needs openssl at runtime; wget for the healthcheck
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates wget \
 && rm -rf /var/lib/apt/lists/*

# standalone bundle + the trees Next does not inline
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# overlay the complete production dependency tree so the Prisma CLI and the
# one-off scripts (migrations, seed) run under `docker compose run`
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
