# syntax=docker/dockerfile:1
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
# placeholder only, so `prisma generate`/`next build` can resolve a DATABASE_URL at build time —
# the real value is supplied at container runtime via docker-compose's env_file/environment
ENV DATABASE_URL="file:./build-placeholder.db"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts prisma.config.ts middleware.ts ./
COPY prisma ./prisma
COPY public ./public
COPY lib ./lib
COPY scheduler ./scheduler

EXPOSE 3000
CMD ["npm", "run", "start"]
