# Unified search (OpenSearch)

Typo-tolerant site search and PLP/agenda `q` filtering powered by a self-hosted OpenSearch index in Medusa.

## Scope

| Surface | Endpoint | Index kinds |
|---------|----------|-------------|
| Header QuickSearch (`mode=suggest`) | `GET /store/search` | category, product (future activities only), city, page |
| `/zoeken` (`mode=full`) | `GET /store/search` | product, category, city, page, docent, person |
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
- **Salesforce import:** re-indexes product after `importProductgroupFromSalesforce`
- **Sanity pages/persons:** `POST /hooks/sanity-search` (configure Sanity publish webhook)

## Document fields (products)

Indexed from the PLP listing snapshot: `title`, `handle`, `description`, Salesforce metadata body, `categories`, `docenten`, `cities`, `location_name` (variants), `tags`, `record_type`, `product_type`.

Query uses Dutch analyzer + `fuzziness: AUTO` (e.g. `kollege` → `college`).

## Fallback

When OpenSearch is unavailable, `/store/events` and `/store/agenda` fall back to expanded in-memory substring matching (title, onderwerp, docent, plaats, locatie, content).

## Module

`src/modules/search/` — client, index mapping, document builders, `SearchModuleService`.
