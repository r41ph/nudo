# Deploying nudo

Production runs on [Dokploy](https://docs.dokploy.com) on a Contabo VPS and
serves these domains:

| Domain | Dokploy service | Source |
| --- | --- | --- |
| `nudo.ink`, `www.nudo.ink` | `nudo-web` application | `apps/web/Dockerfile` (static build behind nginx, port 80) |
| `api.nudo.ink` | `nudo-api` application | `apps/api/Dockerfile` (Express, port 3001) |
| — | PostgreSQL 16 database service | Managed by Dokploy, not in this repo |

The Dokploy configuration lives in its UI, not in git. This file is the record
of it. Background and decisions: [`docs/specs/deploy-dokploy.md`](specs/deploy-dokploy.md).

## How a deploy behaves

- **Auto-deploy:** a push to `main` rebuilds both apps.
- **Migrations:** the API container applies pending migrations before it
  starts listening. Migrations that already ran are skipped, so restarts are
  safe. If a migration fails, the container exits and the deploy shows as
  failed. Check the `nudo-api` logs in Dokploy.
- **API URL:** `VITE_API_URL` is baked into the web build. If the API domain
  changes, redeploy `nudo-web` after updating its build argument.
- **Data:** it lives in the Postgres service's volume, not in the app
  containers, so redeploying or rebuilding the apps never touches it.

## Setup from scratch

1. **DNS (GoDaddy → nudo.ink → DNS):**
   - Set the `A @` record to the VPS IP.
   - Add `A api` pointing at the VPS IP.
   - `www` is a CNAME to `nudo.ink` and needs no change.

   Wait until both names resolve (`dig +short nudo.ink api.nudo.ink`) before
   turning on HTTPS, because Let's Encrypt checks DNS.
2. **Backup destination:** create a bucket with an S3-compatible provider
   outside Contabo, such as Cloudflare R2 or Backblaze B2, and an access key
   limited to that bucket. Add it in Dokploy under _Settings → Destinations_,
   then use _Test connection_ to check it.
3. **Postgres:** create a PostgreSQL 16 database service. In its _Backups_ tab,
   add a daily backup (`0 3 * * *`) to that destination with the prefix
   `nudo-db/`.
4. **Dokploy itself:** under _Web Server → Backups_, add a daily backup to the
   same destination with the prefix `dokploy/`. It saves Dokploy's own database
   and `/etc/dokploy`, so the steps below can be restored instead of redone.
5. **nudo-api:** create an Application from the GitHub repo:
   - Branch: `main`
   - Build type: Dockerfile
   - Dockerfile path: `apps/api/Dockerfile`
   - Docker context path: `.`
   - Environment:

     ```
     DB_HOST=<internal host from the database's Internal Credentials>
     DB_PORT=5432
     DB_USER=<internal user>
     DB_PASSWORD=<internal password>
     DB_NAME=<database name>
     JWT_SECRET=<openssl rand -hex 32>
     JWT_EXPIRES_IN=7d
     FRONTEND_URL=https://nudo.ink,https://www.nudo.ink
     ```

   - Domain: `api.nudo.ink`, container port `3001`, HTTPS with Let's Encrypt.
6. **nudo-web:** create an Application from the same repo:
   - Branch: `main`
   - Build type: Dockerfile
   - Dockerfile path: `apps/web/Dockerfile`
   - Docker context path: `.`
   - Build argument: `VITE_API_URL=https://api.nudo.ink`
   - Domains: `nudo.ink` and `www.nudo.ink`, container port `80`, HTTPS with
     Let's Encrypt.
7. **Auto-deploy:** turn it on for both applications.
8. **Restore drill:** once there's real data, restore the latest `nudo-db/`
   backup into a scratch database service and check that it holds the data.
   Repeat this after any change to the backup setup.

## Building the images locally

Run these from the repo root:

```bash
docker build -f apps/api/Dockerfile -t nudo-api:local .
docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=http://localhost:3001 -t nudo-web:local .
```

The API image expects the same environment variables as step 5, with a
reachable Postgres.

## Keeping the Dockerfiles in sync

Each Dockerfile copies only the manifests and sources of its app and the
workspace packages it depends on. The web image copies `packages/ui`. If an app
starts depending on another workspace package, add that package's
`package.json` and source to the app's Dockerfile, or the image build fails.
