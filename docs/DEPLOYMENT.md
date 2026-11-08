# Deployment

## Staging

Push to the `staging` branch triggers a GitHub Actions workflow that deploys all three apps:

| App | Where it runs | How |
|-----|---------------|-----|
| **Sanity Studio** | GitHub Actions runner | `sanity deploy` + `schema:deploy` to Sanity hosting |
| **Frontend** | Your server (`frontend` user) | SSH → `frontend/scripts/deploy.sh` |
| **Medusa** | Your server (`medusa` user) | SSH → `medusa/scripts/deploy.sh` |

Heavy work (install, build, migrate, restart) runs on the server for Frontend and Medusa. GitHub Actions only orchestrates.

Workflow file: [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml)

The storefront at **https://v2.vrijeacademie.nl** is noindexed (`robots: noindex, nofollow`, `X-Robots-Tag`, `robots.txt` disallows `/`).

## Architecture

```
push to staging
    ├── deploy-sanity   → npm ci, sanity deploy, schema deploy (Actions runner)
    ├── deploy-frontend → SSH frontend@server → ~/app/frontend/scripts/deploy.sh
    └── deploy-medusa   → SSH medusa@server   → ~/app/medusa/scripts/deploy.sh
```

The three jobs run **in parallel**.

## Zero-downtime approach

1. **Reset checkout, then build** — GitHub Actions resets `~/app` to `origin/staging` before running the deploy script (`git checkout -f` + `git reset --hard`). Tracked local edits on the server are discarded; gitignored files (`.env`) are not touched. Then `npm ci` and `npm run build` run while the old PM2 process keeps serving traffic.
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

**Frontend shared cache (staging/production):** add `REDIS_URL` to `~/app/frontend/.env` — use the **same value** as in `~/app/medusa/.env` so default PLP/Agenda `unstable_cache` entries are shared across all Next PM2 workers. Reload frontend PM2 after adding it.

**Salesforce order push (staging)** — required in `~/app/medusa/.env`:

- `SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID=0121t000000QIr0AAG` (sandbox Participant, not Teacher). Without it, new website customers cannot be created in Salesforce and completed orders never appear there.
- `SALESFORCE_MEDUSA_CUSTOM_FIELDS=false` (default) — do not send `Medusa_Order_Id__c` / `Medusa_Product_Id__c` / other Medusa_* fields; they are not on this Salesforce org. Set `true` only after those External Id fields exist.

After changing Medusa `.env`, reload PM2 (`pm2 startOrReload ecosystem.config.cjs`) and re-push the order: `npm run salesforce:push -- --type=order --action=push --display-id=N`.

**VA Thuis / Audience Player (staging)** — required in `~/app/medusa/.env` or preview and purchased playback return 500 (`Audience Player OAuth credentials are not configured`) and the storefront shows “Deze preview is momenteel niet beschikbaar.”:

| Variable | Purpose |
|----------|---------|
| `AUDIENCE_PLAYER_CLIENT_ID` | OAuth client id from Audience Player support (also accepts `AUDIENCE_PLAYER_OAUTH_CLIENT_ID`) |
| `AUDIENCE_PLAYER_CLIENT_SECRET` | OAuth client secret (also accepts `AUDIENCE_PLAYER_OAUTH_CLIENT_SECRET`) |
| `AUDIENCE_PLAYER_PROJECT_ID` | Optional, default `14` |
| `AUDIENCE_PLAYER_PREVIEW_EMAIL` | Optional, default `vathuis-preview@vrijeacademie.nl` — that user must be entitled to play preview articles |

Copy the values from local `medusa/.env` (do not commit them). Reload PM2 after editing. Smoke-test: `GET https://medusastag.vrijeacademie.nl/store/events/art-nouveau/episodes/1-1/preview-playback` with the publishable API key should return `{ playback: { token, articleId, assetId, … } }`.

**Transactional email (staging)** — OTP login codes and cadeaubon mail. Add to `~/app/medusa/.env` (SMTP wins if both are set). Reload PM2 after editing. Configure SPF/DKIM/DMARC for the From domain.

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP hostname (`127.0.0.1` for local postfix, or the organisation relay) |
| `SMTP_PORT` | Optional, default `587` (`25` for local postfix, `465` implies SSL) |
| `SMTP_SECURE` | Optional, `true`/`false` (default: true only when port is 465). Does **not** disable STARTTLS. |
| `SMTP_IGNORE_TLS` | Optional. Default `true` for `127.0.0.1`/`localhost`/`::1` so Nodemailer does not STARTTLS against local Postfix snakeoil. Set `false` to allow STARTTLS. |
| `SMTP_USER` / `SMTP_PASS` | Optional; omit for unauthenticated localhost |
| `SMTP_FROM` | From address — recommended `"Vrije Academie" <info@vrijeacademie.nl>` (code default `info@vrijeacademie.nl` when unset) |
| `SENDGRID_API_KEY` / `SENDGRID_FROM` | Fallback when `SMTP_HOST` is unset |

Without SMTP or SendGrid, OTP codes are logged on the Medusa server only (`[customer-otp]`).

**Stape / server GTM (staging)** — add to `~/app/medusa/.env` when the server container is live (full GTM steps: [`docs/STAPE-GTM-BRIEFING.md`](./STAPE-GTM-BRIEFING.md)):

| Variable | Purpose |
|----------|---------|
| `SGTM_ENABLED` | `true` to send `purchase` / `refund` / `sign_up` from Medusa subscribers |
| `SGTM_ENDPOINT_URL` | Stape server URL + Data Client path, e.g. `https://gtm.example.nl/data` |
| `SGTM_PURCHASE_SECRET` | Optional shared secret (Bearer or custom header via `SGTM_API_KEY_HEADER`) |

Reload PM2 after editing. Smoke: complete a test order and check Medusa logs for `[gtm-purchase] sent`. No configuration exists in Medusa Admin—only `.env` and the GTM containers.

**Smoke test (after PM2 reload):** request a storefront login OTP for a test inbox. Confirm **From** is `Vrije Academie <info@vrijeacademie.nl>` and authentication passes (SPF/DKIM/DMARC in the provider’s “show original” view). If the relay rejects the From address, allow `info@vrijeacademie.nl` on Postfix or the SMTP account.

Set production URLs for `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `MEDUSA_URL`, CORS origins, database, Redis, etc.

**Tax-inclusive pricing (one-time):** after first Medusa setup or when tax/country config changes, run as the `medusa` user: `cd ~/app/medusa && npm run seed:region`. Seeds all EU countries on the EUR region, standard VAT rates, the system tax provider (`tp_system`) on every tax region, and EUR tax-inclusive price preference (Salesforce gross prices must not be surcharged with VAT). Re-run backfills any region whose `provider_id` is missing or not `tp_system`; without that, add-to-cart returns 500 (`Unable to retrieve the tax provider with id: null`) for that shipping country.

**Visual editing (Presentation tool)** — required in `~/app/frontend/.env`:

| Variable | Description |
|----------|-------------|
| `SANITY_API_READ_TOKEN` | Viewer token from [sanity.io/manage](https://sanity.io/manage) → API → Tokens (draft read). Without it, `/api/draft` returns 503 and the preview shows published content only. |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Hosted Studio URL including `basePath`, e.g. `https://<project-id>.sanity.studio/studio` |

In the Sanity project (**API → CORS origins**), add `https://v2.vrijeacademie.nl` with **Allow credentials** checked so `SanityLive` can subscribe to draft updates in the Presentation iframe.

**Open Graph (staging):** when `NEXT_PUBLIC_SITE_URL` is the future production canonical (`https://vrijeacademie.nl`), set `NEXT_PUBLIC_STOREFRONT_PUBLIC_URL=https://v2.vrijeacademie.nl` so default share images resolve to `/branding/logo.svg` on the live Next host (otherwise crawlers hit legacy apex redirects). After go-live, point both URLs at production.

Sanity Studio env for CI is provided via GitHub Secrets (see below), not on the server.

### 5. Medusa dependencies

Medusa requires PostgreSQL and (recommended) Redis on the server or reachable from it:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (enables Redis workflow engine, event bus and locking). The Redis instance **must** use `maxmemory-policy noeviction`: the event bus and workflow engine keep BullMQ queues in Redis, and `allkeys-lru` silently evicts queued jobs (Medusa logs `IMPORTANT! Eviction policy is allkeys-lru. It should be "noeviction"` on every line). Staging uses the instance on port 6378 (`/etc/redis/redis-persistent.conf`, `CONFIG` is disabled so it needs a config edit + restart as root):

  ```bash
  sudo sed -i 's/^maxmemory-policy .*/maxmemory-policy noeviction/' /etc/redis/redis-persistent.conf
  grep -q '^maxmemory-policy' /etc/redis/redis-persistent.conf || echo 'maxmemory-policy noeviction' | sudo tee -a /etc/redis/redis-persistent.conf
  sudo systemctl restart redis-persistent
  pm2 logs medusa --lines 20 --nostream   # the eviction warning should be gone
  ```

  Listing caches share this Redis; they all have TTLs, so with `noeviction` they expire instead of being evicted.
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
| `SANITY_STUDIO_REVALIDATE_SECRET` | Bearer secret baked into hosted Studio for **Clear page cache** (same value as frontend `SANITY_STUDIO_REVALIDATE_SECRET`) |
| `SENTRY_AUTH_TOKEN` | Optional. Org auth token for **source map upload** during `next build` (frontend). Create at [Auth Tokens](https://vrije-academie.sentry.io/settings/account/api/auth-tokens/) with `org:ci`, `project:releases`, `project:write` — then set on the server `frontend/.env` and/or this GitHub secret. |
| `SENTRY_DSN_FRONTEND` | DSN for `vrije-academie-frontend` (for reference / future CI; staging servers still use `.env`) |
| `SENTRY_DSN_MEDUSA` | DSN for `vrije-academie-medusa` |
| `SENTRY_ORG` | `vrije-academie` |
| `SENTRY_ENVIRONMENT_STAGING` | `staging` |
| `PROD_SERVER_HOST` | Production host SSH target, e.g. `prod1.vrijeacademie.nl` |
| `PROD_SSH_DEPLOY_KEY` | Private SSH key for `frontend` and `medusa` on production (separate from staging) |
| `SANITY_STUDIO_DATASET_PROD` | Optional. Sanity dataset for production Studio deploy; omit to reuse `SANITY_STUDIO_DATASET` |
| `SANITY_STUDIO_REVALIDATE_SECRET_PROD` | Optional. Bearer secret for Studio **Clear page cache** on production; omit to reuse staging secret |

CI also sets `SANITY_STUDIO_PREVIEW_URL` to `https://v2.vrijeacademie.nl` for the Presentation tool (bundled at deploy time). `SANITY_STUDIO_REVALIDATE_SECRET` is bundled the same way for the page ⋯ **Clear page cache** action.

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
pm2 logs medusa-worker   # subscribers, scheduled jobs, Salesforce/Sanity sync
```

**`local changes would be overwritten by merge`** — Deploys reset the server checkout to `origin/staging` (`git checkout -f` + `git reset --hard`) before install/build, so tracked local edits cannot block the update. Gitignored files (`.env`) are left in place.

If a still-tracked gitignored file blocks checkout (e.g. old `frontend/next-env.d.ts`), run once as that app user:

```bash
cd ~/app && git rm --cached frontend/next-env.d.ts && git reset --hard origin/staging
```

## Frontend troubleshooting

**Category tiles without images on staging, but correct locally** — Category `image` lives on the mirrored Sanity `category` document and must be **published** (drafts are invisible on the storefront). After publish, `POST /api/revalidate/sanity` busts `/`, `/va-thuis`, and `/ons-aanbod/{slug}` when the webhook includes `_type == "category"`. Without the webhook, wait up to 60 s or redeploy. See `frontend/docs/components.md` (troubleshooting §6).

**Frontend keeps restarting every 15–40 min, breaks Sanity Presentation/live preview** — PM2 `error log path` will show `App [frontend] exceeds --max-memory-restart value`. Two independent causes, both fixed:

1. **Next.js 16.1.x server `fetch` memory leak** — only one of two tee'd `Response` clones was registered with `FinalizationRegistry` in `next@16.1.6`, so ArrayBuffers backing every server-side `fetch` (Sanity `sanityFetch`, Medusa calls) were never reclaimed, growing RSS ~5 MB/s until PM2's 512 MB cap was hit. Fixed upstream in `next@16.2.12` ([vercel/next.js#90897](https://github.com/vercel/next.js/pull/90897)) — keep `frontend` on `next@^16.2.12` or newer, never pin back to `16.1.x`.
2. **PM2 process stuck in `fork` mode** — if `frontend` was ever started with `pm2 start` outside `ecosystem.config.cjs` (or `pm2 reload <name>` on a pre-existing process), it stays single-instance/fork forever; `pm2 reload`/`startOrReload` on an *existing* process does not change `exec_mode`/`instances`, so every crash-restart was a full outage instead of one cluster worker cycling. Verify with `pm2 jlist | grep -A2 exec_mode`; if it says `fork_mode` while `ecosystem.config.cjs` says `cluster`, fix with `pm2 delete frontend && pm2 start ecosystem.config.cjs && pm2 save`.

**Broken docent/teacher photos, `⨯ The requested resource isn't a valid image ... received null` in logs** — `docent.photoUrl` was sometimes a Salesforce session-relative path (e.g. `/services/images/photo/001...`) extracted from a rich-text field or `Account.PhotoUrl`. Those only resolve inside an authenticated Salesforce session, so Next's image optimizer fetches them from our own origin and gets a 404/login page instead of image bytes. `medusa/src/modules/salesforce-sync/utils/photo-url.ts` (`isUsablePhotoUrl`) now rejects non-absolute and `salesforce.com`/`force.com` URLs before they're synced to Sanity; `VaThuisTeacherGrid` also guards at render time as a defense-in-depth fallback.

**PLP (`/ons-aanbod`) felt slow for ~1 in every ~600s window (fixed)** — `medusa/src/lib/store-listing-snapshot.ts` (`loadCached`) used a hard-TTL cache-aside pattern: whichever request happened to arrive right after the 600 s TTL expired blocked on a full snapshot rebuild (~3–4 s, confirmed live via `redis-cli -p 6378 del store:listing:plp` + timing the next request). This hit real visitors essentially at random (any filtered/sorted PLP view, Agenda, or VA Thuis request), not just after deploys — staff testing repeatedly just rarely landed on the unlucky request. Fixed with stale-while-revalidate: a snapshot is now stored as `{ value, builtAt }` with a long physical Redis TTL (`LISTING_CACHE_HARD_TTL_SEC`, 1 h) and is always served instantly once it exists — even past `LISTING_CACHE_TTL_SEC` (600 s) — while a background rebuild refreshes it. Only the very first call ever (nothing cached anywhere) blocks. Default `/ons-aanbod` (no filters) additionally uses a Next.js hard cache (`unstable_cache`, 600 s, itself SWR) via `frontend/src/lib/plp/cached-default-listing.ts`. `medusa/scripts/deploy.sh` still warms the cache after reload. Frontend-side: `getGeneralSettings` uses Sanity CDN outside draft mode; React `cache()` dedupes CMS/PDP calls per request. Note: PDP event detail (`getCachedStoreEventDetail` in `medusa/src/lib/store-event-detail.ts`) still uses the older blocking pattern and could see the same class of cold-hit latency; not yet migrated to SWR.

**PLP (`/ons-aanbod`) shipped a ~2.2 MB HTML/RSC payload per load (fixed)** — `medusaClient.getEventsPaginated` (`frontend/src/lib/commerce/medusa-client.ts`) passed the raw `/store/events` response straight through to `EventCard[]` (only normalizing `docenten`→`teachers`), so the full, un-trimmed `variants` array — every session's `event_item`, `prices`, and `properties`, per Medusa's raw field selection in `buildPlpSnapshot` — rode along for all 24 listed events even though no PLP component reads `EventCard.variants` (the card only needs the pre-computed `price_from` / `earliest_start_at` / `min_available_quantity` summary fields already on the object). Confirmed via `grep -c variant_rank` on the rendered HTML and A/B'd with/without the fix (2.18 MB → 397 KB decoded, 217 KB → 67 KB gzipped over the wire, `loadEventEnd` 350 ms → 162 ms in a live CDP trace). Fix: `getEventsPaginated` now strips `variants` before returning `EventCard[]`. PDP's own `getEvent(handle)` call is untouched — it still needs full session/variant data for the booking table. If a similar per-card slowdown shows up on Agenda or VA Thuis, check whether their mapping functions do the same unfiltered pass-through.

## Medusa troubleshooting

**Stuck in `fork` mode instead of `cluster`** — same drift as the frontend issue above (see Frontend troubleshooting §2); check with `pm2 jlist | grep -A2 exec_mode` and fix with `pm2 delete medusa && pm2 start ecosystem.config.cjs && pm2 save`.

**`ecosystem.config.cjs not found`** — The server checkout is behind `staging`. As the `medusa` user:

```bash
cd ~/app && git fetch origin staging && git reset --hard origin/staging
```

Then use `~/app/medusa/scripts/deploy.sh` (preferred) or `cd ~/app/medusa && pm2 start ecosystem.config.cjs`.

**`Unknown arguments: migrations, run`** — Medusa v2 uses `db:migrate`, not `migrations run`. Ensure `package.json` has `"migrate": "medusa db:migrate"` (then `npm run migrate`).

**Deploy hangs after `Migrations completed` / `Syncing links...` on `Select tables to DELETE`** — Medusa found link tables in the database whose `src/links/` definitions were removed (currently the old variant ↔ city / location / docent pivots; session facets now live on `EventItem`). Locally that is an interactive checkbox; over SSH there is no TTY so migrate never finishes and PM2 is never reloaded. `medusa/scripts/deploy.sh` runs `npx medusa db:migrate --execute-all-links`, which creates/updates links and **drops** removed link tables without prompting. To unblock a hung deploy: Ctrl+C the stuck migrate, then re-run `bash ~/app/medusa/scripts/deploy.sh` (or `npx medusa db:migrate --execute-all-links` then `pm2 startOrReload ecosystem.config.cjs`). Do not use `--execute-safe-links` here — that skips the drops and the prompt returns on the next migrate.

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
| CMS pages (`[...slug]`) | ISR, `revalidate = 60` — on-demand bust via Sanity webhook (`POST /api/revalidate/sanity`) on page publish, or Studio **Clear page cache** (`POST /api/revalidate/studio`) |
| PLP / Agenda pages | `force-dynamic` — filters via `searchParams`; default `/ons-aanbod` (no filters) uses 120 s hard cache for `sort=order` and `sort=start_date`; default `/agenda` (no filters) uses 120 s hard cache for `sort=start_date` and `sort=start_date_desc` |
| PDP (`/ons-aanbod/[handle]`) | `force-dynamic`; Medusa event detail **stale-while-revalidate** in Redis (`store:event:detail:{handle}` + dirty flag); worker job `refresh-event-detail-snapshots` warms top PLP handles; frontend `unstable_cache` for Medusa + Sanity PDP lookups (tags `pdp:{handle}`); bust via `POST /api/revalidate/plp` with `{ "pdpHandles": ["…"] }` |
| Homepage | ISR, `revalidate = 60`; on-demand bust via Sanity webhook on home page publish, or Studio **Clear page cache** |
| Header / footer (`generalSettings`, `menu`) | ISR, `revalidate = 60` on `(main)/layout`; on-demand bust via the same webhook (`general-settings` tag + `(main)` and `(checkout)` layouts + batched `revalidatePath` for all storefront URLs) |
| Redirect rules | In-memory, 60 s TTL |

### Medusa API caching

PLP (`GET /store/events`) and Agenda (`GET /store/agenda`) use **denormalized listing snapshots** stored in Redis, shared across all PM2 cluster workers:

| Layer | File | Role |
|-------|------|------|
| Redis keys | `medusa/src/lib/store-listing-redis.ts` | `store:listing:plp`, `store:listing:agenda`, `store:listing:registrations`, `store:event:detail:{handle}` |
| Snapshot build | `medusa/src/lib/store-listing-snapshot.ts` | Loads + enriches full catalog once; routes only filter/facet/sort/paginate in memory |
| Event detail | `medusa/src/lib/event-detail-rebuild.ts` | Redis SWR + cross-worker build lock for `GET /store/events/:handle` |
| Event detail worker | `medusa/src/jobs/refresh-event-detail-snapshots.ts` | Rebuilds dirty/aged PDP blobs for top PLP slots every minute |
| Frontend PDP cache | `frontend/src/lib/commerce/cached-pdp.ts`, `frontend/src/lib/cms/cached-pdp-sanity.ts` | Shared `unstable_cache` across PM2 workers (needs `REDIS_URL` on frontend) |
| Similar courses | `medusa/src/lib/store-similar-events.ts` | Derives siblings from PLP snapshot (no per-sibling Postgres graph) |
| Base query cache | `medusa/src/lib/store-query-cache.ts` | Product ids + event-group links (used when building snapshots) |
| Invalidation | `medusa/src/subscribers/invalidate-store-listing-cache.ts` | Sets listing **dirty** flags for worker rebuild; create/delete always; update when product is in first 24 slots or VA Thuis |
| Worker rebuild | `medusa/src/jobs/refresh-store-listing-snapshots.ts` | Every minute on `medusa-worker`: rebuild dirty or aged snapshots (Redis lock per slot); revalidates Next PLP after PLP rebuild |
| Frontend PLP hard cache | `frontend/src/lib/plp/cached-default-listing.ts` | `unstable_cache` (120 s) for unfiltered `/ons-aanbod` with `sort=order` or `sort=start_date`; bust via `POST /api/revalidate/plp` |
| Frontend Agenda hard cache | `frontend/src/lib/agenda/cached-default-listing.ts` | `unstable_cache` (120 s) for unfiltered `/agenda` with `sort=start_date` or `sort=start_date_desc`; bust via the same `POST /api/revalidate/plp` (`agenda-default` tag) |
| Frontend Next data cache | `frontend/cache-incremental.cjs` + `next.config.js` | When `REDIS_URL` is set, `cacheHandler` stores `unstable_cache` / ISR entries in Redis (`next:storefront:` prefix) so all PM2 workers share one hard cache; `cacheMaxMemorySize: 0` disables per-worker duplicates. `DEPLOYMENT_VERSION` (git SHA on deploy) isolates entries per release. |

**PLP/Agenda/VA Thuis/registration-counts snapshots**: Redis stores the blob + separate `:built_at` key (`LISTING_SNAPSHOT_VERSION` 6). API `loadCached` is **memory-first** (compares tiny `built_at` before loading the blob). Rebuilds run on **`medusa-worker`** only; invalidation sets `store:listing:dirty:*`. Only a true cold start (no Redis blob) blocks on the API.

**PDP detail**: Same pattern — physical Redis TTL `LISTING_CACHE_HARD_TTL_SEC`; logical freshness `EVENT_DETAIL_FRESHNESS_TTL_SEC` (defaults to `LISTING_CACHE_TTL_SEC`). Product updates set `store:event:detail:dirty:{handle}` and POST storefront revalidate. HTTP `Cache-Control` on `/store/events/:handle` still uses `LISTING_CACHE_TTL_SEC`.

**Staging performance env (Medusa `~/app/medusa/.env`, reload PM2 after edit):**

| Variable | Suggested staging | Purpose |
|----------|-------------------|---------|
| `LISTING_CACHE_TTL_SEC` | `120` | Rebuild when snapshot age exceeds this |
| `LISTING_CACHE_HARD_TTL_SEC` | `604800` | Redis blob TTL (7 d fallback) |
| `EVENT_DETAIL_FRESHNESS_TTL_SEC` | _(unset → `LISTING_CACHE_TTL_SEC`)_ | Logical PDP freshness (availability) |
| `EVENT_DETAIL_CACHE_TTL_SEC` | `86400` | Legacy name; physical PDP Redis TTL follows `LISTING_CACHE_HARD_TTL_SEC` |
| `PDP_MEDUSA_CACHE_SEC` / `PDP_SANITY_CACHE_SEC` | `60` | Frontend `unstable_cache` for PDP (optional in `frontend/.env`) |
| `SALESFORCE_WEBHOOK_QUEUE_BATCH_SIZE` | `10` | Smaller webhook batches |
| `SALESFORCE_WEBHOOK_QUEUE_CONCURRENCY` | `2` | Less parallel SF work |
| `SALESFORCE_WEBHOOK_DEFER_LOADAVG` | `6` | Skip queue tick when 1-min load &gt; threshold |
| `SALESFORCE_WEBHOOK_DEFER_FREE_MB` | `512` | Skip queue tick when free RAM &lt; threshold |
| `STORE_SLOW_REQUEST_MS` | `500` | Log `/store/*` slower than this |

**PM2 auto-sizing** (`scripts/pm2-sizing.cjs`, used by both `ecosystem.config.cjs` files): reserves `PM2_RESERVED_MB` (default `3500` for Postgres + Redis + OpenSearch + OS on a single 8 GB host). Overrides: `PM2_FRONTEND_INSTANCES`, `PM2_MEDUSA_INSTANCES`, `PM2_*_MAX_MEMORY`, `PM2_RESERVED_MB`. Deploy prints resolved counts and runs `scripts/pm2-scale-cluster.sh` when the running cluster size drifts.

| Host | Typical result (no overrides) |
|------|-------------------------------|
| 3 CPU, 8 GB | frontend 2×~768M, medusa 2×~768M, worker 1×1G |
| 4 CPU, 16 GB | frontend 3×1G, medusa 3×1G, worker 1×1.5G |

**Structured logs (grep PM2 / sampler output):**

| `tag` | Meaning |
|-------|---------|
| `listing-cache` | `hit` / `miss` (API) or `rebuild` (worker) + optional `buildMs` per listing slot |
| `event-detail-cache` | PDP Redis `hit` / `miss` / `rebuild` + `handle` |
| `store-slow` | Slow Medusa store API request |
| `subscriber-perf` | Subscriber run ≥ 200 ms |
| `subscriber-perf-minute` | Per-minute event counts per subscriber |
| `host-perf` | Load, memory, swap, PM2 restarts, URL probe TTFB |

**Host sampler (optional cron on staging server, as `medusa` user):**

```bash
mkdir -p ~/logs
# Add PERF_PROBE_MEDUSA_PUBLISHABLE_KEY to ~/app/medusa/.env for the events probe
* * * * * cd ~/app/medusa && npm run perf:sampler >> ~/logs/va-perf-sampler.log 2>&1
```

Requires `REDIS_URL` on the **Medusa** server for cross-worker sharing; without Redis, an in-process fallback is used per worker (holds the same envelope, never auto-expires — always superseded by the next successful rebuild).

**Frontend:** copy the same `REDIS_URL` into `~/app/frontend/.env` (distinct key prefix — does not collide with Medusa `store:listing:*` keys). Without it, local dev keeps the default in-memory cache; production should always set it when using PM2 cluster mode.

**Post-deploy warm:** `frontend/scripts/deploy.sh` runs `scripts/warm-listing-cache.sh` after PM2 reload — best-effort `curl` of default PLP/Agenda URLs (up to 120 s each, retries) so one worker populates the shared Next hard cache and Medusa listing snapshot before traffic hits. Frontend and Medusa deploy jobs run in parallel; if Medusa is still restarting, warm may retry or warn without failing the deploy.

**Optional env for immediate PLP + Agenda bust on catalog changes** (same secret on both sides):

| Service | Variable | Example |
|---------|----------|---------|
| Frontend | `REVALIDATE_SECRET` | random string |
| Medusa | `STOREFRONT_REVALIDATE_PLP_URL` | `https://v2.vrijeacademie.nl/api/revalidate/plp` |
| Medusa | `STOREFRONT_REVALIDATE_SECRET` | same as `REVALIDATE_SECRET` |

**Sanity → frontend on-demand page revalidation** (configure webhook manually at [sanity.io/manage](https://sanity.io/manage) → API → Webhooks):

| Setting | Value |
|---------|-------|
| URL | `https://v2.vrijeacademie.nl/api/revalidate/sanity` |
| Dataset | `production` (and `staging` if applicable) |
| Trigger on | Create, Update, Delete |
| Filter | `_type in ["page", "generalSettings", "menu", "category", "product"]` |
| Projection | Pages: `{ "_type": _type, "slug": coalesce(slug.current, slug), "isVaThuis": isVaThuis }`. Product: `{ "_type": "product", "handle": handle, "medusaId": medusaId }` |
| Secret | Same string as frontend `SANITY_REVALIDATE_SECRET` |

Set `SANITY_REVALIDATE_SECRET` in `~/app/frontend/.env` on the server. Sanity signs the request body; the route verifies via `next-sanity/webhook` `parseBody`. VA Thuis pages (`va-thuis/…`) are skipped — those routes are `force-dynamic`. `generalSettings` and `menu` publishes bust the `general-settings` fetch tag, the `(main)` and `(checkout)` layouts, then queue a background pass that calls `revalidatePath` for every storefront URL (sitemap paths including `noIndex` CMS rows, plus private chrome such as `/winkelwagen` and `/mijn-account/*`) in batches of 50 with a 100 ms pause between batches so regeneration does not spike. **Category** publishes bust `/`, `/va-thuis`, and `/ons-aanbod/{slug}` so tile thumbnails do not wait on ISR. Draft-only General Settings is invisible on the storefront — publish the singleton. The 60 s ISR window remains as a fallback when the webhook is not configured or fails.

**Manual page cache clear from Studio:** page documents expose **Clear page cache** in the document ⋯ menu (not the Publish bar). It POSTs `{ _type, slug }` to `https://v2.vrijeacademie.nl/api/revalidate/studio` with `Authorization: Bearer SANITY_STUDIO_REVALIDATE_SECRET`. Set that secret on the frontend server **and** as a GitHub Actions secret so hosted Studio can send it (it is bundled into Studio JS — use a **different** string from the webhook HMAC `SANITY_REVALIDATE_SECRET`). CORS allows `http://localhost:3333` and `https://*.sanity.studio`. Unlike the webhook, this also revalidates VA Thuis paths.

**HubSpot:** `NEXT_PUBLIC_HUBSPOT_PORTAL_ID=145840897` and `NEXT_PUBLIC_HUBSPOT_REGION=eu1` for form embeds. Hero **Inschrijven** opens a site modal with `HubSpotFormEmbed` (form GUID on hero or legacy CTA → default newsletter form `b8d92c58-…`). Other GUIDs in `form-ids.ts`. Studio list: `GET /api/hubspot` + `HUBSPOT_TOKEN`. CORS: `localhost:3333`, `https://*.sanity.studio`.

Responses carry `Cache-Control: public, s-maxage=600, stale-while-revalidate=600` on listing and event detail routes.

### PM2 cluster mode

Both apps use **cluster** mode with instance counts from `scripts/pm2-sizing.cjs` (see table above). Medusa requires `REDIS_URL` (workflow engine, event bus, locking). Frontend uses the same Redis for `cacheHandler` when `REDIS_URL` is in `~/app/frontend/.env`.

`medusa/ecosystem.config.cjs` runs two PM2 apps ([Medusa worker mode](https://docs.medusajs.com/learn/production/worker-mode)):

| App | Mode | Instances | Role |
|---|---|---|---|
| `medusa` | `MEDUSA_WORKER_MODE=server`, cluster, port 9000 | auto (see sizing) | HTTP API + admin |
| `medusa-worker` | `MEDUSA_WORKER_MODE=worker`, fork, port 9001 | 1 | Subscribers, scheduled jobs, listing + PDP refresh jobs |

Events are queued in Redis and processed by the worker with concurrency 5, so a burst (e.g. a Salesforce bulk import emitting thousands of `product-variant.updated`) no longer fans out in-memory inside the API processes. Before the split, all three `shared` instances hit the 1 GB cap every few minutes during imports (~300 PM2 restarts each), and the in-memory local event bus lost pending events — including payment webhooks — on every restart. `scripts/deploy.sh` recreates `medusa` once when `medusa-worker` does not exist yet (instance count does not change on `startOrReload`).

### Sanity Live / Draft mode

`SanityLive` and `VisualEditing` are only rendered when `draftMode()` is enabled. Regular visitors never open a Live Content API connection.

### Load testing

[k6](https://grafana.com/docs/k6/) scenarios live in [`loadtest/`](../loadtest/). Copy `loadtest/config.env.example`, set `BASE_URL`, `MEDUSA_URL`, and `PUBLISHABLE_KEY`, then:

```bash
k6 run loadtest/scenarios/browse.js
./loadtest/run-all.sh
```

During a run, watch server swap, PM2 RSS, and logs tagged `store-slow`, `listing-cache`, `event-detail-cache`. Copy `loadtest/config.env.example` → `loadtest/config.env` (gitignored).

**Staging baseline (laptop → v2 / medusastag.vrijeacademie.nl):**

| Scenario | Metric | Result |
|----------|--------|--------|
| `browse.js` | `page_duration` p95 @ 20 VU, 3 min ramp | ~98 ms HTTP / custom page metric similar; 0% errors, ~12 iter/s |
| `api-only.js` | `http_req_duration` p95 @ 20 VU, 90 s | ~785 ms, 0% errors (post PDP cache + security deploy `f1dbcdb`) |
| `pdp-hot-cold.js` | `pdp_hot_ms` / `pdp_cold_ms` p95, 2 min | ~821 ms / ~861 ms, 0% errors (down from ~1.2 s pre-cache; hot k6 threshold 800 ms still marginal) |

Ops: `node scripts/verify-staging-revalidate.mjs` (needs `REVALIDATE_SECRET` + `PUBLISHABLE_KEY`). Patch Medusa server env: `SERVER_HOST=… REVALIDATE_SECRET=… scripts/patch-staging-revalidate-env.sh`. Patch Sentry on staging: `SERVER_HOST=… SENTRY_AUTH_TOKEN=… scripts/patch-staging-sentry-env.sh` (SSH as `frontend` / `medusa`; reloads PM2). Sanity webhook reference: [`sanity/webhooks/storefront-revalidate.reference.json`](../sanity/webhooks/storefront-revalidate.reference.json) (add `product` to filter — CLI needs `sanity.project.webhooks` grant).

## Sentry (error tracking)

Org: **vrije-academie** ([sentry.io](https://sentry.io)). Separate projects recommended: `vrije-academie-frontend` and `vrije-academie-medusa`.

### Server `.env` (per app user)

| Variable | Frontend | Medusa |
|----------|----------|--------|
| `SENTRY_DSN` | Yes | Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (browser) | — |
| `SENTRY_ENVIRONMENT` | `staging` / `production` | same |
| `SENTRY_RELEASE` | Set by deploy script (full git SHA) | same |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional (`1` staging, `0.2` prod default) | same |
| `SENTRY_AUTH_TOKEN` | Build-time source maps | optional for Medusa release |
| `SENTRY_ORG` / `SENTRY_PROJECT` | `vrije-academie` / `vrije-academie-frontend` | `vrije-academie-medusa` |

Leave DSN unset locally to keep Sentry disabled in development.

### Deploy / releases

`frontend/scripts/deploy.sh` and `medusa/scripts/deploy.sh` export `SENTRY_RELEASE` from the git commit before `npm run build`. PM2 passes `SENTRY_RELEASE` via `ecosystem.config.cjs`.

Medusa initializes Sentry from `medusa/src/instrument.ts` (imported at the top of `medusa-config.ts`) on **server** and **medusa-worker** processes.

The storefront tunnels browser events via `/monitoring` (`withSentryConfig` in `next.config.js`) to reduce ad-blocker loss.

### Production monitors (org `vrije-academie`)

Configured in Sentry (email → project owner). Cron check-ins are sent only from **production `medusa-worker`** (`withCronMonitor` in `medusa/src/lib/sentry.ts`; 5 min margin, 10 min max runtime). Do not run scheduled jobs with `SENTRY_DSN` + `NODE_ENV=development` against production monitor slugs — that creates a stray `development` environment and false missed check-ins (delete that env in Sentry if it happens).

**Uptime**

| Monitor | URL |
|---------|-----|
| Storefront homepage | `https://prod.vrijeacademie.nl/` (`vrije-academie-frontend`) |
| Medusa health | `https://medusa.vrijeacademie.nl/health` (`vrije-academie-medusa`) |

**Cron** (SDK check-ins, `vrije-academie-medusa`): `process-salesforce-webhook-queue`, `refresh-store-listing-snapshots`, `refresh-event-detail-snapshots`.

**Metric** (environment `production`): error spikes (frontend + Medusa), `flow:checkout`, `flow:auth`, Salesforce order sync (critical on any error), non-order Salesforce sync, integration-not-ready (`kind:integration-not-ready`), webhook queue backlog (`kind:queue-backlog`), store API p95 latency (`/store/*` spans).

**Issue alerts**: new issue + regression in `production`; dedicated rules for tags `flow:checkout` and `flow:salesforce-sync` (Medusa ± frontend). Metric breaches use workflow **Production: metric monitor email**.

**Salesforce Slack**: set `SALESFORCE_SYNC_ALERT_WEBHOOK_URL` on production Medusa for terminal workflow failures (buckets 1/5/25/100); Sentry is the primary ops channel.

### Verify after DSNs are set

1. Trigger a test error on staging (e.g. temporary misconfiguration) and confirm events in both projects.
2. Complete a checkout on staging and confirm linked traces (`sentry-trace` / `baggage` from storefront → Medusa `/store/*`).
3. Confirm releases show the deploy commit SHA and source maps resolve stack frames (frontend needs `SENTRY_AUTH_TOKEN` on build).

## Production

Push to `main` triggers [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml). Jobs mirror staging but target **prod1.vrijeacademie.nl** (`frontend` and `medusa` OS users) and reset `~/app` to `origin/main` with `DEPLOY_BRANCH=main`.

| App | Public URL | Server user |
|-----|------------|-------------|
| Storefront | https://prod.vrijeacademie.nl | `frontend@prod1.vrijeacademie.nl` |
| Medusa | https://medusa.vrijeacademie.nl | `medusa@prod1.vrijeacademie.nl` |

Sanity Studio deploy uses `SANITY_STUDIO_PREVIEW_URL=https://prod.vrijeacademie.nl`. Dataset / revalidate secrets can differ via `SANITY_STUDIO_DATASET_PROD` and `SANITY_STUDIO_REVALIDATE_SECRET_PROD` (or reuse the staging secrets).

### One-time production server setup

Repeat [One-time server setup](#one-time-server-setup) on prod1 with these differences:

- Checkout branch **`main`** (not `staging`) in both `~/app` clones.
- Provision **separate** Postgres and Redis on prod1; Redis must use `maxmemory-policy noeviction` (same as staging).
- Register the production deploy SSH **public** key for GitHub Actions (`PROD_SSH_DEPLOY_KEY`).
- Configure nginx (or equivalent) for `prod.vrijeacademie.nl` → port 3000 and `medusa.vrijeacademie.nl` → port 9000.

### Production environment files

Run on prod1 after `~/app` exists (from either user; set output paths if needed):

```bash
cd ~/app
STAGING_SSH_HOST=<staging-server-host> \
  PROD_DATABASE_URL='postgresql://…' \
  PROD_REDIS_URL='redis://127.0.0.1:…' \
  bash scripts/prod/setup-env.sh
```

The script SSH-reads staging `~/app/*/.env`, copies integration secrets (Salesforce, SMTP, Audience Player, OpenSearch, sGTM, Sentry DSNs, etc.), generates **new** `JWT_SECRET` / `COOKIE_SECRET`, and sets production URLs (`STORE_CORS`, `MEDUSA_URL`, `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, revalidate secrets, `SENTRY_ENVIRONMENT=production`). Review **Mollie** (live vs `test_*`), Salesforce org, and Sanity webhooks/CORS for `https://prod.vrijeacademie.nl` before go-live.

Set `SANITY_STUDIO_REVALIDATE_SECRET_PROD` in GitHub to the same value as `SANITY_STUDIO_REVALIDATE_SECRET` on the production frontend `.env`.

### Clone Medusa data from staging

Full Postgres copy brings regions, tax, API keys, admin users, promotions, and link tables (Medusa config lives in the database). Run as **`medusa`** on prod1 after production `.env` exists and `pg_dump` / `pg_restore` / `psql` are installed:

```bash
cd ~/app
STAGING_SSH_HOST=<staging-server-host> \
  node scripts/prod/copy-staging-to-prod.mjs --dry-run
STAGING_SSH_HOST=<staging-server-host> \
  node scripts/prod/copy-staging-to-prod.mjs --confirm-prod
```

The script:

1. Stops `medusa` / `medusa-worker` PM2 processes.
2. Dumps production to `~/backups/medusa-db/prod-before-staging-clone-*.dump`.
3. Streams `pg_dump` from staging over SSH and restores with `pg_restore --clean --if-exists`.
4. Runs `npx medusa db:migrate --execute-all-links`.
5. Flushes Redis listing/event keys (not workflow queues).
6. Optional `rsync` of `~/app/medusa/static/` from staging (`--skip-static` to opt out).
7. `pm2 startOrReload` and optional `npm run search:reindex` when `OPENSEARCH_NODE` is set.

Flags: `--dry-run`, `--confirm-prod` (required), `--skip-static`, `--skip-opensearch`, `--skip-redis`.

**Rollback DB:** as `medusa`, with `DATABASE_URL` loaded from `.env`:

```bash
pm2 stop medusa medusa-worker
pg_restore --clean --if-exists --no-owner --no-acl -d "$DATABASE_URL" ~/backups/medusa-db/prod-before-staging-clone-<timestamp>.dump
pm2 startOrReload ecosystem.config.cjs
```

Then run the frontend deploy once both sides match (`DEPLOY_BRANCH=main bash ~/app/frontend/scripts/deploy.sh`).

### Triggering a production deploy

```bash
git checkout main
git merge staging   # or commit on main
git push origin main
```

Monitor **Actions → Deploy Production**. Staging continues to deploy from `staging` independently.

## Files reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-staging.yml` | GitHub Actions workflow (staging) |
| `.github/workflows/deploy-production.yml` | GitHub Actions workflow (main → prod1) |
| `scripts/prod/setup-env.sh` | Bootstrap production `.env` from staging over SSH |
| `scripts/prod/copy-staging-to-prod.mjs` | Clone staging Medusa Postgres (+ static, OpenSearch reindex) |
| `frontend/scripts/deploy.sh` | Server-side frontend deploy (sets `DEPLOYMENT_VERSION`, runs listing warm) |
| `frontend/scripts/warm-listing-cache.sh` | Post-deploy warm for default PLP/Agenda + top PDP paths |
| `scripts/pm2-sizing.cjs` | Host-aware PM2 instances and memory caps |
| `scripts/pm2-scale-cluster.sh` | Align running PM2 cluster size after deploy |
| `loadtest/` | k6 load test scenarios |
| `medusa/src/lib/event-detail-rebuild.ts` | PDP Redis stale-while-revalidate |
| `medusa/src/jobs/refresh-event-detail-snapshots.ts` | Worker PDP warm for top PLP handles |
| `frontend/cache-incremental.cjs` | Redis `cacheHandler` for shared Next data cache |
| `medusa/scripts/deploy.sh` | Server-side medusa deploy |
| `frontend/ecosystem.config.cjs` | PM2 config (Next.js, port 3000, cluster mode) |
| `medusa/ecosystem.config.cjs` | PM2 config (Medusa, port 9000, cluster mode) |
| `medusa/src/lib/store-listing-redis.ts` | Redis listing cache keys + invalidation |
| `medusa/src/lib/store-listing-snapshot.ts` | PLP/agenda snapshot builders |
| `medusa/src/lib/store-event-detail.ts` | PDP event detail Redis cache |
| `medusa/src/lib/store-similar-events.ts` | Similar courses from PLP snapshot |
| `medusa/src/subscribers/invalidate-store-listing-cache.ts` | Smart cache bust on catalog/order changes |
| `frontend/src/lib/plp/cached-default-listing.ts` | Next.js hard cache for default PLP |
| `frontend/src/lib/agenda/cached-default-listing.ts` | Next.js hard cache for default Agenda |
| `frontend/src/app/api/revalidate/plp/route.ts` | Webhook to bust PLP + Agenda hard caches |
| `frontend/src/app/api/revalidate/sanity/route.ts` | Webhook to bust CMS page ISR cache on Sanity publish |
| `frontend/src/app/api/revalidate/studio/route.ts` | Studio ⋯ menu to bust a single page ISR cache |
