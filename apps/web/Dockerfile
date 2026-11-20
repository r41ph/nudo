# Build from the repo root:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.nudo.ink .
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Manifests of @nudo/web and every workspace package it depends on.
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter "@nudo/web..."
COPY tsconfig.base.json ./
COPY packages/ui packages/ui
COPY apps/web apps/web
# Vite inlines this at build time; an empty value would ship a web app with no API.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @nudo/web build

FROM nginx:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
