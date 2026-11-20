# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
# devDependencies stay: tsx runs the TypeScript migrations at container start.
RUN pnpm install --frozen-lockfile --filter @nudo/api
COPY apps/api apps/api
RUN pnpm --filter @nudo/api build

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
# config/env.ts locates the repo root through pnpm-workspace.yaml.
COPY --from=build /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["sh", "-c", "./node_modules/.bin/tsx --conditions=development src/db/run-migrate.ts && exec node dist/index.js"]
