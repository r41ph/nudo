# Spec: Deploy to Dokploy

> Status: In review (PR #59 — https://github.com/r41ph/nudo/pull/59)
> Branch: `feat/deploy-dokploy`

## Objective

Nudo only runs locally today. This makes it deployable to a self-hosted
[Dokploy](https://docs.dokploy.com) instance on a Contabo VPS, so that a push to
`main` can become a running app behind HTTPS with no manual steps on the server.

### Success criteria

- [ ] `docker build` succeeds for both images from a clean clone.
- [ ] The API image starts against an empty Postgres, applies every migration,
      then serves `/auth` and GraphQL.
- [ ] Restarting the API container doesn't re-apply migrations that already ran.
- [ ] The web image serves the SPA. Deep links such as `/projects/123` load
      after a hard refresh instead of returning 404.
- [ ] The web app talks to the API cross-origin with CORS, both on HTTPS.
- [ ] A runbook lets someone set up the Dokploy project from scratch.

### Decisions (resolved 2026-11-20)

1. **Two Dokploy Applications** with build type _Dockerfile_: `nudo-api` on
   `api.nudo.ink`, and `nudo-web` on `nudo.ink` and `www.nudo.ink`.
2. **Postgres is a Dokploy database service**, not part of this repo. Its data
   lives in a Docker volume, separate from the stateless API container. The API
   connects over Dokploy's internal network using the _Internal Host_
   credentials.
3. **Backups go off the VPS.** Dokploy's scheduled backups upload to an
   S3-compatible destination outside Contabo, so losing the VPS doesn't lose the
   data. The Dokploy server itself, meaning its own database and `/etc/dokploy`,
   is backed up there as well, so the UI-only configuration can be restored.
4. **DNS stays at GoDaddy.** A records for `@` and `api` point at the VPS, and
   `www` is an existing CNAME to `nudo.ink`. Reverse DNS isn't needed because
   nudo sends no email.
5. **Migrations run when the API container starts**, before the server listens.
   Dokploy Applications have no pre-deploy hook, and node-pg-migrate locks and
   records each migration, so re-running on every start is safe. A failed
   migration exits the container, so the deploy fails loudly instead of serving
   a stale schema.
6. **The API image keeps `tsx`.** Migrations are TypeScript and
   `run-migrate.ts` loads them with `--import tsx`. Compiling migrations
   separately would mean a second build pipeline for a few MB of image size.
7. **`VITE_API_URL` is a build argument** of the web image. Vite inlines it at
   build time, so changing the API domain means rebuilding the web app.
8. **The API alias becomes a Node subpath import, `#api/*`** (added
   2026-11-20). `@api/*` was a tsconfig `paths` alias, which `tsc` leaves
   untouched in its output, so `node dist/index.js` crashed with
   `ERR_MODULE_NOT_FOUND`. `pnpm start` was broken for the same reason. Node,
   `tsc`, `tsx` and Vitest all resolve `package.json` `"imports"` natively: the
   `development` condition maps to `src/` for `tsx` and Vitest, and `default`
   maps to `dist/` for production. `@web/*` and `@ui/*` don't change, because
   Vite resolves them.

### Out of scope

- CI/CD changes. Dokploy's own GitHub auto-deploy on push is enough.
- A health-check endpoint and zero-downtime deploys. Add later if downtime
  during a redeploy turns out to matter.
- Docker Compose for production, and serving web and API from one origin.
- Monitoring and log shipping.

## Repo changes

| File | Change |
| --- | --- |
| `apps/api/Dockerfile` | Multi-stage, built from the repo root. Installs with `pnpm --frozen-lockfile` for `@nudo/api` only, runs `tsc`, and the runtime stage runs `pnpm migrate && node dist/index.js`. Node 24 and pnpm come from the root `packageManager` field via corepack. |
| `apps/web/Dockerfile` | Multi-stage, built from the repo root. Takes `ARG VITE_API_URL`, builds `@nudo/web` (which pulls in `packages/ui`), and serves `dist/` with nginx. |
| `apps/web/nginx.conf` | SPA fallback (`try_files $uri /index.html`), long cache headers for hashed `assets/`, `no-cache` for `index.html`. |
| `.dockerignore` | Excludes `node_modules`, `dist`, `coverage`, `.env`, `.git` and Storybook output, so local state doesn't leak into images. |
| `docs/deploy.md` | Runbook (see below). |
| `apps/api/package.json`, `tsconfig.json`, `vitest*.config.ts` | `"imports"` entry for `#api/*`. Every `tsx` script passes `--conditions=development`. The tsconfig `paths` and the Vitest `@api` aliases are removed. |
| `apps/api/src/**` | The 3 `@api/` imports become `#api/`. |
| `CLAUDE.md`, `README.md` | The alias tables show `#api/*`. `CLAUDE.md` gets a short _Deploy_ section that points at `docs/deploy.md` and the local image build commands. |

### Constraints the images must respect

- `config/env.ts` finds the repo root by looking for `pnpm-workspace.yaml` and
  throws if there isn't one. The API runtime image keeps the monorepo layout,
  including that file. A missing `.env` is fine because dotenv skips it, and
  Dokploy injects real env vars.
- `NODE_ENV=production` must be set in the API image. It turns off PostGraphile's
  GraphiQL, schema watching and error stacks.
- The API listens on `API_PORT`, defaulting to 3001. Dokploy's domain settings
  must use that container port. The web image listens on 80.

## Dokploy runbook (`docs/deploy.md`)

1. **DNS (GoDaddy):** edit `A @` from "WebsiteBuilder Site" to the VPS IP, and
   add `A api` pointing at the VPS IP. Leave `www`, NS, SOA, `_domainconnect`
   and `_dmarc` as they are. Wait until both names resolve
   (`dig +short nudo.ink api.nudo.ink`) before turning on HTTPS in Dokploy.
2. **Backup destination:** create a bucket with an S3-compatible provider
   outside Contabo, such as Cloudflare R2 or Backblaze B2, and an access key
   limited to that bucket. Add it in Dokploy under _Settings → Destinations_,
   then use _Test connection_ to check it.
3. **Postgres:** create a PostgreSQL 16 database service. In its _Backups_ tab,
   add a daily backup (`0 3 * * *`) to that destination with the prefix
   `nudo-db/`.
4. **Dokploy itself:** under _Web Server → Backups_, add a daily backup to the
   same destination with the prefix `dokploy/`. It saves the Dokploy config so
   the steps below don't have to be repeated by hand after a VPS loss.
5. **nudo-api:** Application from the GitHub repo, branch `main`, build type
   Dockerfile, Dockerfile path `apps/api/Dockerfile`, context `.`. Set these
   environment variables:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, from the
     database's internal credentials
   - `JWT_SECRET`, a fresh random value (`openssl rand -hex 32`)
   - `JWT_EXPIRES_IN`
   - `FRONTEND_URL=https://nudo.ink,https://www.nudo.ink`
   - `NODE_ENV=production`

   Add domain `api.nudo.ink` on port 3001 with HTTPS (Let's Encrypt).
6. **nudo-web:** Application, Dockerfile path `apps/web/Dockerfile`, context
   `.`, build argument `VITE_API_URL=https://api.nudo.ink`. Add domains
   `nudo.ink` and `www.nudo.ink` on port 80 with HTTPS.
7. **Auto-deploy:** turn it on for both apps.
8. **Restore drill:** once there's real data, restore the latest database
   backup into a scratch database service, to prove the backups work.

## Verification

This is infrastructure, so no row of the required-tests matrix applies: there's
no app logic, route, migration or UI change. It is verified by hand before the
PR is opened:

1. Build both images locally from the repo root.
2. Run the API image against a fresh local Postgres. Check that migrations
   apply, a second start applies none, and `POST /auth/register` returns a
   token.
3. Run the web image with `VITE_API_URL` pointed at the local API container.
   Log in, open a deep link, and hard-refresh it.
4. After merge, do the first real deploy on Dokploy and record the outcome in
   the PR.
