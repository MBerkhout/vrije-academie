# Unified search (OpenSearch)

Typo-tolerant site search and PLP/agenda `q` filtering powered by a self-hosted OpenSearch index in Medusa.

## Scope

| Surface | Endpoint | Index kinds |
|---------|----------|-------------|
| Header QuickSearch (`mode=suggest`) | `GET /store/search` | category, product (future live events + VA Thuis on-demand), city, page |
| `/zoeken` (`mode=full`) | `GET /store/search` | product (incl. VA Thuis), category, city, page, docent, person |
| Ons aanbod / Agenda `?q=` | `GET /store/events`, `GET /store/agenda` | product (ranked ids) |

Frontend never talks to OpenSearch directly; credentials stay on Medusa.

## Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENSEARCH_NODE` | Yes (for search) | — | e.g. `http://localhost:9200` |
| `OPENSEARCH_USERNAME` | No | — | Basic auth user (production) |
| `OPENSEARCH_PASSWORD` | No | — | Basic auth password |
| `SEARCH_INDEX` | No | `va-search` | Index name |
| `SANITY_SEARCH_WEBHOOK_SECRET` | For live Sanity sync | — | Header `x-sanity-search-webhook-secret` on `POST /hooks/sanity-search` |

Sanity indexing also uses `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_WRITE_TOKEN`.

## Local development

```bash
cd medusa
./start-db.sh                    # Postgres (skip if medusa-postgres already runs)
docker compose up -d opensearch  # OpenSearch
docker start medusa-redis        # if you already have a medusa-redis container; otherwise: docker compose up -d redis
npm run search:reindex           # full index rebuild
```

If `docker compose up -d` fails with a container name conflict, Postgres/Redis were likely started outside Compose (`./start-db.sh` or an older run). Use the commands above instead of a full `docker compose up -d`.

OpenSearch dashboard/API: `http://localhost:9200`.

## Reindex

```bash
npm run search:reindex
```

Rebuilds all commerce docs (products, categories, cities, docenten) and Sanity pages/persons. **Deletes and recreates** the `va-search` index so analyzer settings stay correct (OpenSearch cannot change analysis settings on an existing index).

## Index sync (incremental)

- **Products:** subscriber on `product.*`, `product-variant.*`
- **Catalog / people:** subscriber on `catalog.category.*`, `catalog.city.*`, `people.docent.*`
- **Salesforce import:** re-indexes product after `importProductgroupFromSalesforce`. The import busts listing cache first, then indexes. Incremental product reindex loads VA Thuis from the database (not the listing snapshot), so a stale Redis/PM2 cache cannot delete the OpenSearch doc.
- **Sanity pages/persons/categories:** `POST /hooks/sanity-search` (configure Sanity publish webhook). Category updates re-index the matching OpenSearch `category-{medusaId}` doc (title, description, image, SEO).

## Document fields (products)

Indexed from the PLP listing snapshot plus the VA Thuis listing snapshot: `title`, `handle`, `description`, Salesforce metadata body, `categories`, `docenten`, `cities`, `location_name` (variants), `tags`, `record_type`, `product_type`. VA Thuis hits use `/va-thuis/{handle}` (not Ons aanbod).

Full rebuild (`search:reindex`) reads those snapshots. **Per-product reindex** (Salesforce webhook / `product.updated`) does **not** rely on the cached VA Thuis snapshot: it loads the published bundle from the database. Otherwise a webhook that runs before the 10-minute listing cache refreshes would **remove** the product from `/zoeken` even though the PDP is live.

Query requires **all terms** (`cross_fields` + `operator: and` on title, handle, onderwerp, docent, plaats, locatie). Body/excerpt is not a required match, so `Colleges Iran` does not return every college series or a Georgia/Armenia text that merely mentions Iran. Light typo tolerance (`fuzziness: 1`) applies only to title/handle — not to autocomplete ngrams (e.g. `kollege` → `college`). Prefix tokens such as `rijks` still match `Rijksmuseum` via `title.autocomplete`.

## Fallback

When OpenSearch is unavailable, `/store/events` and `/store/agenda` fall back to expanded in-memory substring matching (title, onderwerp, docent, plaats, locatie, content).

## Module

`src/modules/search/` — client, index mapping, document builders, `SearchModuleService`.
