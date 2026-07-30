# Deployment (Staging)

Push to the `staging` branch triggers a GitHub Actions workflow that deploys all three apps:

| App | Where it runs | How |
|-----|---------------|-----|
| **Sanity Studio** | GitHub Actions runner | `sanity deploy` + `schema:deploy` to Sanity hosting |
| **Frontend** | Your server (`frontend` user) | SSH → `frontend/scripts/deploy.sh` |
| **Medusa** | Your server (`medusa` user) | SSH → `medusa/scripts/deploy.sh` |

Heavy work (install, build, migrate, restart) runs on the server for Frontend and Medusa. GitHub Actions only orchestrates.

Workflow file: [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml)

## Architecture

```
push to staging
    ├── deploy-sanity   → npm ci, sanity deploy, schema deploy (Actions runner)
    ├── deploy-frontend → SSH frontend@server → ~/app/frontend/scripts/deploy.sh
    └── deploy-medusa   → SSH medusa@server   → ~/app/medusa/scripts/deploy.sh
```

The three jobs run **in parallel**.

## Zero-downtime approach

1. **Build before restart** — deploy scripts run `npm ci` and `npm run build` while the old PM2 process keeps serving traffic.
2. **`pm2 startOrReload ecosystem.config.cjs`** — after a successful build (and `npm run migrate` for Medusa), this re-applies `ecosystem.config.cjs` (instances, `exec_mode`, etc.) and reloads gracefully instead of a hard restart. Unlike `pm2 reload <name>`, it re-syncs config on every deploy so the process can't silently drift from what's checked into git (see Frontend troubleshooting below).
3. **Failed deploys** — if build or migrate fails, the script exits before reload; the running process is unchanged.

## One-time server setup

### 1. Create OS users

```bash
sudo adduser frontend
sudo adduser medusa
```

### 2. Install runtime (both users need Node + PM2)

On the server (as root or via sudo):

```bash
# Node.js 20 (example via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# PM2 globally
sudo npm install -g pm2
```

Ensure `node`, `npm`, `git`, and `pm2` are on the PATH for both `frontend` and `medusa`.

### 3. Clone the repository

Each user gets a full monorepo clone at `~/app`:

```bash
# As frontend user
sudo -u frontend -i
git clone git@github.com:MBerkhout/vrije-academie.git ~/app
cd ~/app && git checkout staging

# As medusa user
sudo -u medusa -i
git clone git@github.com:MBerkhout/vrije-academie.git ~/app
cd ~/app && git checkout staging
```

Use SSH deploy keys or HTTPS with credentials the server can use for `git pull`.

### 4. Environment files

Create `.env` on the server (never commit these):

| Path | Template |
|------|----------|
| `~/app/frontend/.env` | [`frontend/.env.example`](../frontend/.env.example) |
| `~/app/medusa/.env` | [`medusa/docs/README.md`](../medusa/docs/README.md) + [`medusa/.env.template`](../medusa/.env.template) |

Set production URLs for `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `MEDUSA_URL`, CORS origins, database, Redis, etc.

**Visual editing (Presentation tool)** — required in `~/app/frontend/.env`:

| Variable | Description |
|----------|-------------|
| `SANITY_API_READ_TOKEN` | Viewer token from [sanity.io/manage](https://sanity.io/manage) → API → Tokens (draft read). Without it, `/api/draft` returns 503 and the preview shows published content only. |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Hosted Studio URL including `basePath`, e.g. `https://<project-id>.sanity.studio/studio` |

In the Sanity project (**API → CORS origins**), add `https://v2.vrijeacademie.nl` with **Allow credentials** checked so `SanityLive` can subscribe to draft updates in the Presentation iframe.

Sanity Studio env for CI is provided via GitHub Secrets (see below), not on the server.

### 5. Medusa dependencies

Medusa requires PostgreSQL and (recommended) Redis on the server or reachable from it:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (enables workflow engine)
- **OpenSearch** (unified site + PLP search) — self-hosted or managed node reachable from Medusa

| Variable | Description |
|----------|-------------|
| `OPENSEARCH_NODE` | OpenSearch URL, e.g. `https://search.internal:9200` |
| `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` | Optional basic auth |
| `SEARCH_INDEX` | Index name (default `va-search`) |
| `SANITY_SEARCH_WEBHOOK_SECRET` | Secret for `POST /hooks/sanity-search` (Sanity page/person indexing) |

After first deploy with OpenSearch configured, run a full index build on the server:

```bash
cd ~/app/medusa && npm run search:reindex
```

See [`medusa/docs/SEARCH.md`](../medusa/docs/SEARCH.md). Local stack: `medusa/start-db.sh` (Postgres) + `medusa/docker-compose.yml` (Redis + OpenSearch).

Run migrations on first deploy or manually:

```bash
cd ~/app/medusa && npm ci && npm run migrate
```

### 6. SSH deploy key for GitHub Actions

Generate a key pair used only for deploys:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

Add the **public** key to both users:

```bash
# frontend
sudo -u frontend mkdir -p /home/frontend/.ssh
sudo -u frontend bash -c 'cat deploy_key.pub >> /home/frontend/.ssh/authorized_keys'
sudo chmod 700 /home/frontend/.ssh
sudo chmod 600 /home/frontend/.ssh/authorized_keys

# medusa
sudo -u medusa mkdir -p /home/medusa/.ssh
sudo -u medusa bash -c 'cat deploy_key.pub >> /home/medusa/.ssh/authorized_keys'
sudo chmod 700 /home/medusa/.ssh
sudo chmod 600 /home/medusa/.ssh/authorized_keys
```

Store the **private** key as the `SSH_DEPLOY_KEY` GitHub secret.

### 7. First-time PM2 start

```bash
# As frontend user
cd ~/app/frontend
npm ci && npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command (may need sudo)

# As medusa user
cd ~/app/medusa
npm ci && npm run build && npm run migrate
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Default ports: Frontend **3000**, Medusa **9000** (configure reverse proxy/nginx in front).

## GitHub Secrets

In the repo: **Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `SSH_DEPLOY_KEY` | Private SSH key for `frontend` and `medusa` users |
| `SERVER_HOST` | Server hostname or IP |
| `SANITY_AUTH_TOKEN` | Token from [sanity.io/manage](https://sanity.io/manage) (Deploy / API) |
| `SANITY_STUDIO_PROJECT_ID` | Sanity project ID (also used as the hosted studio subdomain on first deploy) |
| `SANITY_STUDIO_DATASET` | Dataset name (e.g. `production` or `staging`) |

CI also sets `SANITY_STUDIO_PREVIEW_URL` to `https://v2.vrijeacademie.nl` for the Presentation tool (bundled at deploy time).

You do **not** need a separate studio hostname secret. CI sets `studioHost` from `SANITY_STUDIO_PROJECT_ID`, so the first deploy registers `https://<project-id>.sanity.studio` automatically. Only add `SANITY_STUDIO_HOSTNAME` if you later want a custom subdomain instead of the project ID.

## Triggering a deploy

Push or merge to `staging`:

```bash
git checkout staging
git merge main   # or commit directly
git push origin staging
```

Monitor progress under **Actions** in GitHub.

## Manual deploy (debugging)

SSH into the server and run the same scripts GitHub Actions uses:

```bash
# Frontend
sudo -u frontend bash ~/app/frontend/scripts/deploy.sh

# Medusa
sudo -u medusa bash ~/app/medusa/scripts/deploy.sh
```

Optional overrides:

```bash
DEPLOY_BRANCH=staging REPO_DIR=~/app bash ~/app/frontend/scripts/deploy.sh
```

## Logs and status

```bash
pm2 status
pm2 logs frontend
pm2 logs medusa
```

**`local changes would be overwritten by merge` (e.g. `frontend/next-env.d.ts`)** — Next.js auto-regenerates `frontend/next-env.d.ts` on `dev`/`build`. That file is gitignored; if an older server checkout still tracks it, run once as the `frontend` user:

```bash
cd ~/app && git rm --cached frontend/next-env.d.ts && git pull --ff-only origin staging
```

Future deploys should not hit this after the ignore is on `staging`.

## Frontend troubleshooting

**Category tiles without images on staging, but correct locally** — The homepage is built during `npm run build`. If Sanity category images were added after the last deploy, redeploy the frontend (push to `staging` or run `frontend/scripts/deploy.sh`). The home route revalidates every 60s after deploy; see `frontend/docs/components.md` (troubleshooting §6).

**Frontend keeps restarting every 15–40 min, breaks Sanity Presentation/live preview** — PM2 `error log path` will show `App [frontend] exceeds --max-memory-restart value`. Two independent causes, both fixed:

1. **Next.js 16.1.x server `fetch` memory leak** — only one of two tee'd `Response` clones was registered with `FinalizationRegistry` in `next@16.1.6`, so ArrayBuffers backing every server-side `fetch` (Sanity `sanityFetch`, Medusa calls) were never reclaimed, growing RSS ~5 MB/s until PM2's 512 MB cap was hit. Fixed upstream in `next@16.2.12` ([vercel/next.js#90897](https://github.com/vercel/next.js/pull/90897)) — keep `frontend` on `next@^16.2.12` or newer, never pin back to `16.1.x`.
2. **PM2 process stuck in `fork` mode** — if `frontend` was ever started with `pm2 start` outside `ecosystem.config.cjs` (or `pm2 reload <name>` on a pre-existing process), it stays single-instance/fork forever; `pm2 reload`/`startOrReload` on an *existing* process does not change `exec_mode`/`instances`, so every crash-restart was a full outage instead of one cluster worker cycling. Verify with `pm2 jlist | grep -A2 exec_mode`; if it says `fork_mode` while `ecosystem.config.cjs` says `cluster`, fix with `pm2 delete frontend && pm2 start ecosystem.config.cjs && pm2 save`.

**Broken docent/teacher photos, `⨯ The requested resource isn't a valid image ... received null` in logs** — `docent.photoUrl` was sometimes a Salesforce session-relative path (e.g. `/services/images/photo/001...`) extracted from a rich-text field or `Account.PhotoUrl`. Those only resolve inside an authenticated Salesforce session, so Next's image optimizer fetches them from our own origin and gets a 404/login page instead of image bytes. `medusa/src/modules/salesforce-sync/utils/photo-url.ts` (`isUsablePhotoUrl`) now rejects non-absolute and `salesforce.com`/`force.com` URLs before they're synced to Sanity; `VaThuisTeacherGrid` also guards at render time as a defense-in-depth fallback.

**PLP (`/ons-aanbod`) feels slow on first load** — `/store/events` builds a Redis-backed listing snapshot (~3–4 s cold, ~80 ms warm). Cold hits happen after deploy, cache expiry (300 s), or `invalidateStoreListingCache`. `medusa/scripts/deploy.sh` warms the cache after reload. Frontend-side: `getGeneralSettings` uses Sanity CDN (not live double-fetch) outside draft mode; React `cache()` dedupes CMS calls per request; category filter query is slimmed to slug/label only.

## Medusa troubleshooting

**Stuck in `fork` mode instead of `cluster`** — same drift as the frontend issue above (see Frontend troubleshooting §2); check with `pm2 jlist | grep -A2 exec_mode` and fix with `pm2 delete medusa && pm2 start ecosystem.config.cjs && pm2 save`.

**`ecosystem.config.cjs not found`** — The server checkout is behind `staging`. As the `medusa` user:

```bash
cd ~/app && git pull --ff-only origin staging
```

Then use `~/app/medusa/scripts/deploy.sh` (preferred) or `cd ~/app/medusa && pm2 start ecosystem.config.cjs`.

**`Unknown arguments: migrations, run`** — Medusa v2 uses `db:migrate`, not `migrations run`. Ensure `package.json` has `"migrate": "medusa db:migrate"` (then `npm run migrate`).

**`Could not find index.html in the admin build directory`** — After `npm run build`, link the admin output (deploy script does this automatically):

```bash
cd ~/app/medusa
mkdir -p public && rm -rf public/admin
ln -sfn ../dist/public/admin public/admin
pm2 restart medusa
```

## Rollback

1. SSH to the server as the relevant user.
2. Reset the repo to a previous commit:

   ```bash
   cd ~/app
   git log --oneline -5
   git reset --hard <commit-sha>
   ```

3. Re-run the deploy script (rebuilds and reloads):

   ```bash
   bash ~/app/frontend/scripts/deploy.sh
   # or
   bash ~/app/medusa/scripts/deploy.sh
   ```

For Sanity, redeploy Studio from a known-good commit via the workflow or locally with `SANITY_AUTH_TOKEN` set.

## Sanity Studio troubleshooting

**White screen on sanity.io dashboard** — Common causes:

1. **Duplicate `basePath`** — Do not set `project.basePath` in `sanity.cli.ts` when `sanity.config.ts` already has `basePath: "/studio"`. Both together make the build reference `/studio/static/*.js` while hosting serves bundles at `/static/*.js` (the browser loads HTML instead of JS). Keep `basePath` only in `sanity.config.ts`; redeploy.
2. **Stale `deployment.appId`** — If the console logs `Load failed, error in settings` or deploy fails with `Cannot find app with app ID …`, remove the `deployment` block from `sanity.cli.ts`, redeploy, then commit the new `appId` the CLI prints.

**Verify hosting** — After deploy, open the studio and confirm the main bundle is JavaScript, not HTML:

```bash
curl -sI "https://<project-id>.sanity.studio/static/sanity-*.js" -H "Referer: https://www.sanity.io/" | grep content-type
# expect: content-type: application/javascript
```

Studio URL: `https://<SANITY_STUDIO_PROJECT_ID>.sanity.studio/studio`. Local dev: `cd sanity && npm run dev` → `http://localhost:3333/studio`.

**Token permissions** — `SANITY_AUTH_TOKEN` must include the **Deploy Studio** grant (`sanity.project.deployStudio`). A write-only API token is not enough for `sanity deploy`.

## Performance & caching

### Caching strategy

| Route type | Caching |
|------------|---------|
| CMS pages (`[...slug]`) | ISR, `revalidate = 60` — first hit renders fresh, subsequent hits serve from cache |
| PLP / Agenda pages | `force-dynamic` — must be dynamic due to `searchParams` filters and live Medusa data |
| Homepage | `sanityFetch` with CDN, no explicit revalidate |
| Redirect rules | In-memory, 60 s TTL |

### Medusa API caching

PLP (`GET /store/events`) and Agenda (`GET /store/agenda`) use **denormalized listing snapshots** stored in Redis (300 s TTL), shared across all PM2 cluster workers:

| Layer | File | Role |
|-------|------|------|
| Redis keys | `medusa/src/lib/store-listing-redis.ts` | `store:listing:plp`, `store:listing:agenda`, `store:listing:registrations` |
| Snapshot build | `medusa/src/lib/store-listing-snapshot.ts` | Loads + enriches full catalog once; routes only filter/facet/sort/paginate in memory |
| Base query cache | `medusa/src/lib/store-query-cache.ts` | Product ids + event-group links (used when building snapshots) |
| Invalidation | `medusa/src/subscribers/invalidate-store-listing-cache.ts` | Clears keys on `product.*`, `order.completed`, `order.placed` |

Requires `REDIS_URL` on the server for cross-worker sharing; without Redis, an in-process fallback is used per worker.

`GET /store/events/:handle/similar` uses a cached registration-count map (`store:listing:registrations`) instead of scanning all completed orders per request.

Responses also carry `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` for CDN/reverse-proxy caching.

### PM2 cluster mode

`frontend/ecosystem.config.cjs` uses `instances: "max"` and `exec_mode: "cluster"` so all CPU cores serve requests in parallel. Memory limit is per-instance.

Both frontend and Medusa use cluster mode. Medusa requires `REDIS_URL` to be set on the server (which switches the workflow engine to Redis so state is shared across all cluster instances).

### Sanity Live / Draft mode

`SanityLive` and `VisualEditing` are only rendered when `draftMode()` is enabled. Regular visitors never open a Live Content API connection.

## Files reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-staging.yml` | GitHub Actions workflow |
| `frontend/scripts/deploy.sh` | Server-side frontend deploy |
| `medusa/scripts/deploy.sh` | Server-side medusa deploy |
| `frontend/ecosystem.config.cjs` | PM2 config (Next.js, port 3000, cluster mode) |
| `medusa/ecosystem.config.cjs` | PM2 config (Medusa, port 9000, cluster mode) |
| `medusa/src/lib/store-listing-redis.ts` | Redis listing cache keys + invalidation |
| `medusa/src/lib/store-listing-snapshot.ts` | PLP/agenda snapshot builders |
| `medusa/src/subscribers/invalidate-store-listing-cache.ts` | Cache bust on catalog/order changes |
