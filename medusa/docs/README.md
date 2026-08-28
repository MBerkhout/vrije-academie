# Vrije Academie Medusa Backend

Medusa 2 backend for commerce around events (lectures, series, excursions) modeled as products.

## Overview

- **Product Group** = Medusa `Product` + linked `EventGroup` (`record_type`).
- **Product** (ticket/instance) = Medusa `ProductVariant` + linked `EventItem` (`delivery_type`, `available_quantity`).
- Optional **properties** (key/value) on the group or each variant for storefront filters.
- Cart, checkout, promotions: default Medusa, plus **event-specific promotion target rules** (see Promotions below). Line item quantity &gt; 1 is allowed.

See [EVENTS.md](./EVENTS.md) for the domain model and API details. Unified typo-tolerant search: [SEARCH.md](./SEARCH.md). Customer OTP / passwordless checkout: [CUSTOMER_AUTH.md](./CUSTOMER_AUTH.md).

## Architecture

- Custom **`events`** module (`src/modules/events/`) and **module links** to `Product` / `ProductVariant`.
- **Migrations** for module schema: use Medusa CLI (`npx medusa db:generate events`, `npx medusa db:migrate`), not the repo-wide `npm run migrate:*` scripts unless documented otherwise for non-Medusa SQL.
- **Config**: if both `medusa-config.ts` and `medusa-config.js` exist, keep the `events` module entry in **both** so CLI and runtime agree.
- **TypeScript**: do not add `paths` aliases for `@medusajs/framework` or `@medusajs/framework/*`. Dev mode uses `tsconfig-paths`; those aliases shadow `package.json` `exports` and break `require("@medusajs/framework/zod")`. Use `module` / `moduleResolution` `Node16` and rely on framework subpath exports.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional in dev; fake instance may be used)

### Installation

```bash
npm install
```

### Environment

```env
DATABASE_URL=postgres://localhost/medusa
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
COOKIE_SECRET=your-cookie-secret
ADMIN_CORS=http://localhost:7001,http://localhost:9000
STORE_CORS=http://localhost:8000
OPENSEARCH_NODE=http://localhost:9200
SEARCH_INDEX=va-search
```

Local stack: `./start-db.sh` (Postgres), then `docker compose up -d` (Redis + OpenSearch), then `npm run search:reindex`.

### Database

Apply Medusa migrations (includes `events` module):

```bash
npx medusa db:migrate
```

Staging/CI (`medusa/scripts/deploy.sh`) uses `npx medusa db:migrate --execute-all-links` so removed module-link tables are dropped without the interactive “Select tables to DELETE” prompt. Locally the prompt is fine; do not run `--execute-all-links` unless you intend to drop leftover link tables.

### Development

```bash
npm run dev
```

- Medusa Admin: `http://localhost:9000/app`
- Store API: `http://localhost:9000/store`
- Admin API: `http://localhost:9000/admin`

### Storefront Redis cache

Ons aanbod, Agenda, VA Thuis listings, and event-detail payloads are cached in Redis (`store:listing:*`, `store:event:detail:*`). Drop them without restarting Medusa:

```bash
npm run cache:flush
```

Use the same `REDIS_URL` as the running server. Does not delete Medusa workflow/job keys. Also POSTs the optional storefront PLP revalidate webhook when `STOREFRONT_REVALIDATE_PLP_URL` is set.

Built-in Medusa inventory UI (sidebar **Inventory** / **Reservations** items, Settings → **Locations**, product/variant inventory cards) is hidden via `src/admin/widgets/hide-inventory-admin.tsx`. The left admin menu itself stays visible. Capacity is managed in the **Product** variant widget (**Available quantity**).

## Event / Product Group workflow

1. Create a **product** (Product Group) in Admin.
2. Open the **Product Group** widget: set **Record type**, manage **properties**; ensure an `EventGroup` exists (widget/API creates link).
3. Create **variants** (each is a **Product** / event instance).
4. Open the **Product** (variant) widget: set **Delivery type**, **Available quantity**, properties. First save creates `EventItem` + link and turns **Manage inventory** off for that variant.
5. No shipping profile for pure events (existing project rule).

## Promotions (discount codes)

Medusa stores money in the **smallest currency unit** (e.g. EUR **cents**), including the **fixed amount** on a promotion’s application method. Example: **€2.00** off must be saved as **200**, not `2`. If you enter `2`, the cart applies **€0.02** — the storefront and Store API are consistent with Medusa’s totals; fix the promotion value in Admin (or `PATCH` the application method via Admin API).

### Event-specific target rules

In Admin → Promotions → **Target rules** (when application target is **Items**), four extra conditions are available:

| Condition | Attribute | Value format |
|-----------|-----------|--------------|
| Item price (EUR) | `items.unit_price` | Amount in **euros** (major currency unit), e.g. `50` = €50.00. Operators: gt, gte, lt, lte. Only matching line items receive the discount. |
| Event starts on or after | `items.metadata.event_start_from` | Calendar date (stored as `YYYYMMDD`, shown in Admin as `DD/MM/YYYY`). Use with **≥** or **>** . |
| Event starts on or before | `items.metadata.event_start_until` | Same format. Use with **≤** or **<** . Combine both for a date range (two separate rules). |
| Event city | `items.metadata.event_city_slug` | Catalog city **slug** (multiselect). |

**Note:** Cart line item `unit_price` uses **major EUR** (same as Medusa store cart/order graph fields). This is different from promotion **fixed discount amounts**, which are stored in **cents** (see above).

Event date/city values are written to line item metadata server-side when a variant is added to the cart (`POST /store/carts/:id/line-items`). Clients cannot set these keys. Carts created before this feature was deployed have no event metadata on existing lines.

Implementation: `src/lib/event-line-item-metadata.ts`, `src/lib/promotion-event-rule-attributes.ts`, admin Vite plugin `src/admin/vite/promotion-rule-date-picker-plugin.ts` (patches the prebuilt dashboard promotion rule field for event date pickers), optional reference override under `src/admin/overrides/medusa-dashboard/.../rule-value-form-field/`, and core route overrides under `src/api/admin/promotions/` and `src/api/store/carts/[id]/line-items/`. Re-verify after every Medusa upgrade (`src/lib/medusa-core-imports.ts`, date-picker Vite plugin vs dashboard dist chunk shape).

## Catalog cities (plaatsen)

Canonical cities live in the **`catalog`** module as `catalog_city` (`slug`, `label`, `sort_order`). Each offline `event_item` stores `city_slug` (canonical) plus `city` (display label), and `catalog_city_id` for filtering. Admin CRUD: `GET/POST /admin/catalog/cities`, `GET/PATCH/DELETE /admin/catalog/cities/:id`.

Venues/locations are **`catalog_location`** (`slug`, `name`, `city_slug`, optional `room_name`, Salesforce account/room ids). Each offline `event_item` stores `catalog_location_id`. Session instructors are referenced by `event_item.docent_id` (plus product-level **`product-docenten`** for the highlighted docent). Populated on Salesforce product-group import (`resolveEventItemFacetIdsFromSalesforce`).

**Backfill** existing free-text cities:

```bash
npx medusa exec ./src/scripts/backfill-cities.ts
```

Store filter param `city[]` expects a **slug**. Facets return `{ slug, label, count }`.

## Region, tax & pricing (one-time per environment)

Salesforce `Price__c` is imported as a **gross consumer price**. Seed the default EUR region with all EU countries, standard B2C VAT per country, and tax-inclusive EUR pricing:

```bash
npm run seed:region
```

Idempotent — safe to re-run after deploy. Links Mollie payment providers, sets `automatic_taxes`, and creates tax regions from `src/lib/eu-countries.ts`. Not part of the automatic deploy script; run manually on new environments.

## Medusa → Sanity: city mirror

See [SANITY_SYNC.md](./SANITY_SYNC.md). Cities sync as Sanity `city` documents (`medusa-city-<id>`).

- `GET /store/events`, `GET /store/events/:handle`, `GET /store/events/:handle/similar`
- `GET /store/agenda` — flattened event occurrences (one row per `event_item`, future-only by default) for the Agenda page
- `PATCH /admin/events/product-groups/:id`, `GET …`
- `PATCH /admin/events/variants/:id`, `GET …`
- `POST|GET /admin/events/properties`, `PATCH|DELETE /admin/events/properties/:id`
- `POST /hooks/salesforce` — Salesforce outbound webhook (batched `{ object_type, method, ids[] }`, shared secret)
- `/admin/salesforce/*` — sync status, push/pull, webhook queue, failure list & retry (authenticated). See [SALESFORCE_SYNC.md](./SALESFORCE_SYNC.md).

## Documentation

- [EVENTS.md](./EVENTS.md) — module fields, availability, store filters
- [SANITY_SYNC.md](./SANITY_SYNC.md) — Sanity mirror
- [SALESFORCE_SYNC.md](./SALESFORCE_SYNC.md) — Salesforce connector
- [OPEN_POINTS.md](./OPEN_POINTS.md) — future integrations and features
