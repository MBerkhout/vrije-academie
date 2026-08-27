# Medusa ↔ Salesforce sync

Two-way connector for **Customers** (`Contact`), **Orders** (`Order` + `OrderItem`), standard **Products** (`Product2`, optional `PricebookEntry`), and **product groups** (`vaProductgroup__c` + child `vaProduct__c`). Mappings are **TypeScript-only** under `src/modules/salesforce-sync/mappings/`.

Sanity: on **product** and **variant** **push**, the Salesforce upsert runs first; **Sanity mirror** runs in the same workflow after a successful SF step. `product.created` is handled by the Salesforce push path; `product.updated` / `product.deleted` still go through `sync-product-to-sanity`.

## Environment (Medusa)

Connector is a **no-op** when credentials for either auth mode below are missing (safe in dev).

### Option A — JWT bearer (certificate; **no client secret**)

Uses the Connected App **Consumer Key** plus a **private key** whose certificate is uploaded on the app. The **Consumer Secret is not used** in this flow.

```env
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_API_VERSION=60.0
SALESFORCE_CLIENT_ID=<connected_app_consumer_key>
SALESFORCE_USERNAME=<run_as_user@your.org>
SALESFORCE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SALESFORCE_INSTANCE_URL=https://yourorg.lightning.force.com
# SALESFORCE_AUTH_MODE=jwt
```

### Option B — Refresh token (**Consumer Key + Consumer Secret**)

Uses **Consumer Key** (`SALESFORCE_CLIENT_ID`) and **Consumer Secret** (`SALESFORCE_CLIENT_SECRET`) with a long-lived **refresh token** from a one-time OAuth login.

```env
SALESFORCE_LOGIN_URL=https://login.salesforce.com
SALESFORCE_API_VERSION=60.0
SALESFORCE_CLIENT_ID=<connected_app_consumer_key>
SALESFORCE_CLIENT_SECRET=<connected_app_consumer_secret>
SALESFORCE_REFRESH_TOKEN=<from_one_time_oauth>
SALESFORCE_INSTANCE_URL=https://yourorg.my.salesforce.com
# SALESFORCE_AUTH_MODE=refresh_token
```

Obtain `SALESFORCE_REFRESH_TOKEN` once via Salesforce **Web Server / Authorization Code** flow (scopes `api`, `refresh_token`, `offline_access`), **or** use **Admin → Salesforce sync → Connect to Salesforce** (stores refresh token in the database; no env var required).

If both JWT and refresh env vars are set, **JWT wins** unless `SALESFORCE_AUTH_MODE=refresh_token`.

Shared:

```env
SALESFORCE_WEBHOOK_SECRET=<random_long_string>
SALESFORCE_SYNC_ALERT_WEBHOOK_URL=
# Person Account record type for website registration (Customer, not Teacher)
SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID=012...
# Person Account record type for teacher/docent profiles (Account webhooks)
SALESFORCE_TEACHER_ACCOUNT_RECORD_TYPE_ID=012...
# Webhook queue tuning (optional)
# SALESFORCE_WEBHOOK_QUEUE_BATCH_SIZE=50
# SALESFORCE_WEBHOOK_QUEUE_CONCURRENCY=5
# SALESFORCE_WEBHOOK_MAX_ATTEMPTS=5
# OAuth (optional — dev proxy / tunnel)
# SALESFORCE_OAUTH_CALLBACK_URL=https://your-tunnel.example.com/hooks/salesforce/oauth/callback
# SALESFORCE_OAUTH_RETURN_URL=https://your-tunnel.example.com/app/salesforce-sync
# Optional order sync (defaults match VA sandbox)
SALESFORCE_DEFAULT_PRICEBOOK2_ID=01s1t000002j19kAAA
SALESFORCE_DISCOUNT_PRODUCT2_ID=01t1t000001j7i9AAA
# SALESFORCE_GIFTCARD_PRODUCT2_ID=   # Product2 "Cadeaubon"; auto-resolved if unset
# SALESFORCE_VOUCHER_PRODUCT2_ID=    # Product2 "Voucher" for redemption lines
# Medusa_* External Id fields (Order, OrderItem, Product2, …). Off by default — VA Salesforce does not have them yet.
# Set true only after those fields exist. Idempotency then uses salesforce_sync_state.
# SALESFORCE_MEDUSA_CUSTOM_FIELDS=false
```

Admin **Open in Salesforce** (customer/order/product widgets + sync failures page) uses `openInSalesforceUrl` from `GET /admin/salesforce/...`. Instance base comes from `SALESFORCE_INSTANCE_URL`, else the OAuth-stored instance URL after Admin connect. Customers with a linked Person Account open the **Account** record when `salesforce_account_id` is set.

## Salesforce setup (manual)

1. **Connected App** — **JWT** (digital signature + certificate) *or* **refresh token** (OAuth scopes `api` + `refresh_token` / `offline_access`).
2. **External Id** custom fields — **off by default**. `SALESFORCE_MEDUSA_CUSTOM_FIELDS=true` enables `Medusa_Order_Id__c` on `Order`, `Medusa_Order_Item_Id__c` on `OrderItem`, `Medusa_Registration_Id__c` on `Registration__c`, optional `Medusa_Gift_Card_Id__c` on `Voucher__c`, `Medusa_Product_Id__c` / `Medusa_Variant_Id__c` on `Product2`. Until those exist in Salesforce, leave the flag unset/false: payloads use standard SF fields only; Medusa stores the linked Salesforce Id in `salesforce_sync_state` (re-push updates the header; line items may duplicate without external ids). **Customers** use Person Accounts matched by Salesforce **Contact Id** in `salesforce_sync_state` (no Medusa id field in Salesforce).
3. **Inbound webhook**: Flow or Apex `POST` to `{MEDUSA_URL}/hooks/salesforce` with header `X-Salesforce-Webhook-Secret: <same as env>` and JSON body:

```json
{
  "object_type": "Account",
  "method": "update",
  "ids": ["001xxxxxxxxxxxxxxx", "003xxxxxxxxxxxxxxx"]
}
```

Each id is logged as one row in `salesforce_webhook_event`, then processed asynchronously (immediate fire-and-forget + scheduled sweep every minute). Sanity writes during queue processing are batched at the end of each batch.

## Loop protection

- **Pull** sets `incoming_lock_until` on `salesforce_sync_state` before writing Medusa.
- **Push subscribers** skip while that lock is in the future.

## Workflows & queue

Workflows live in `src/workflows/salesforce/`. When `REDIS_URL` is set, `medusa-config.ts` registers the **Redis workflow engine** so runs are queued and durable.

Steps use **retries** (e.g. SF upsert `maxRetries: 5`, apply-from-SF `maxRetries: 3`, state writes `maxRetries: 3`). The REST client retries **429 / 5xx** with backoff. Non-retryable Salesforce API errors fail fast to the **failure / alert** path.

**Alerts** (terminal failure): structured `logger.error`, optional `SALESFORCE_SYNC_ALERT_WEBHOOK_URL`, de-duplicated buckets on `failure_count`.

## Subscribers (`src/subscribers/`)

| File | Event(s) | Action |
|------|-----------|--------|
| `salesforce-sync-customer.ts` | `customer.created`, `customer.updated` | Enqueue Person Account push (skips unchanged profile/address; respects incoming lock) |
| `salesforce-sync-order.ts` | `order.completed` (status `completed`) | Enqueue push order |
| `salesforce-sync-product.ts` | `product.created` | Enqueue push product (+ Sanity in workflow) |
| `salesforce-sync-variant.ts` | `product-variant.created` | Enqueue push variant (+ Sanity in workflow) |

## API

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/admin/salesforce/oauth/status` | Connection status + callback URL |
| `POST` | `/admin/salesforce/oauth/start` | Returns `{ authorizeUrl }` |
| `GET` | `/hooks/salesforce/oauth/callback` | Salesforce redirect; saves refresh token (public, not under `/admin`) |
| `POST` | `/admin/salesforce/oauth/disconnect` | Clears DB-stored token |
| `POST` | `/hooks/salesforce` | Webhook; header secret; logs + queues pull/archive per id |
| `GET` | `/admin/salesforce/webhook-queue` | Queue stats + recent events |
| `POST` | `/admin/salesforce/webhook-queue/process` | Drain pending webhook rows now |
| `POST` | `/admin/salesforce/webhook-queue/:id/retry` | Reset one event to `pending` and re-process |
| `POST` | `/store/customer/me/sync-from-salesforce` | Authenticated; enqueue SF → Medusa pull after password login |
| `GET` | `/admin/salesforce/customers/:id` | Status JSON |
| `POST` | `/admin/salesforce/customers/:id/push` \| `/pull` | Manual run |
| `POST` | `/admin/salesforce/products/import` | Body `{ salesforce_id }` — create Medusa product from Product2 |
| `POST` | `/admin/salesforce/productgroups/import` | Body `{ salesforce_id }` — import `vaProductgroup__c` (+ children) |
| Same pattern | `/admin/salesforce/orders|products|variants/:id` | Variants: **no pull** route in UI |
| `GET` | `/admin/salesforce/failures` | Failure rows |
| `POST` | `/admin/salesforce/failures/:stateId/retry` | Re-enqueue |
| `POST` | `/admin/salesforce/failures/retry-bulk` | Body `{ ids: string[] }` |

## Admin UI

- **Salesforce sync** sidebar route: **Connect to Salesforce** (OAuth), **webhook queue** (pending/processing/failed/done stats, event log, retry), failures table, retry, bulk retry.
- Widgets: customer / order detail; product group & variant panels (**Push** / **Pull** where supported).
- **Order list** (`order.list.before`): banner when failures exist.

### OAuth connect (Consumer Key + Secret)

1. Set `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, and `MEDUSA_URL` in env; restart Medusa.
2. Open **Admin → Salesforce sync**. Copy the **callback URL** shown on the page.
3. In Salesforce Connected App → OAuth settings, add that callback URL. Enable scopes `api`, `refresh_token`, `offline_access`.
4. Click **Connect to Salesforce**, log in, approve. Medusa uses **PKCE** (`code_challenge` / `code_verifier`) as required by modern Salesforce Connected Apps. The refresh token is stored in `salesforce_oauth_settings`.
5. Optional: **Disconnect** clears the DB token (env `SALESFORCE_REFRESH_TOKEN` is unchanged).

Callback route: `GET /hooks/salesforce/oauth/callback` — lives under `/hooks` (like payment webhooks) so it never hits admin auth. Secured by one-time `state` + PKCE. Set `SALESFORCE_OAUTH_RETURN_URL` to where Admin lives (e.g. `http://localhost:9000/app/salesforce-sync`).

#### Dev proxy / tunnel

When Salesforce must hit a **public URL** (ngrok, Cloudflare Tunnel, etc.) but Medusa runs on `localhost`:

```env
MEDUSA_URL=http://localhost:9000
# Exact URL registered in Salesforce — proxy must forward to Medusa /hooks/salesforce/oauth/callback
SALESFORCE_OAUTH_CALLBACK_URL=https://abc123.ngrok.io/hooks/salesforce/oauth/callback
# Where the browser opens Admin after connect (if you use Admin via the same proxy)
SALESFORCE_OAUTH_RETURN_URL=https://abc123.ngrok.io/app/salesforce-sync
```

The **Connected App callback URL** in Salesforce must match `SALESFORCE_OAUTH_CALLBACK_URL` **exactly** (including path). The authorize request and token exchange both use this value.

If `SALESFORCE_OAUTH_CALLBACK_URL` is set, `MEDUSA_URL` is not required for OAuth (still needed for Mollie webhooks etc.).

## CLI

```bash
npm run salesforce:probe

npm run salesforce:push -- --type=customer --action=push --id=cus_...
npm run salesforce:push -- --type=order --action=push --all --limit=1
# Update existing Medusa product from Salesforce
npm run salesforce:pull -- --type=product --action=pull --id=prod_... --salesforce-id=01t...
# Import Product2 as a new Medusa product (draft + default variant, €0 placeholder price)
npm run salesforce:pull -- --type=product --action=pull --salesforce-id=01t...
# Import vaProductgroup__c (published, hidden from PLP, variants + event items from vaProduct__c)
npm run salesforce:pull -- --type=productgroup --action=pull --salesforce-id=a05Mz00000YEMptIAH
# Bulk import all future product groups + VAthuis + linked-online + online-only groups
npm run salesforce:import-future
# Bulk import Salesforce Person Account contacts → Medusa (Active__c + email; no passwords)
npm run salesforce:import-customers -- --dry-run --limit=5
# Backfill VAthuis + linked-online parents/slaves only (after enabling Linked_Online merge)
npm run salesforce:import-linked-vathuis
# Bulk import every product group (past + future) — manual guard bypass, re-syncs VAthuis metadata etc.
npm run salesforce:import-all
# Preview without writing: npm run salesforce:import-future -- --dry-run --limit=10
# npm run salesforce:import-linked-vathuis -- --dry-run
# npm run salesforce:import-all -- --dry-run --limit=10
# Faster full re-import (prefetch + parallel imports, no SF push-back):
npm run salesforce:import-all -- --concurrency=4
# Defer search reindex until end of batch:
npm run salesforce:import-all -- --concurrency=4 --skip-search
# Read-only dump of a product group + children (discover docent / embed fields)
npm run salesforce:inspect -- --url=art-nouveau
npm run salesforce:inspect -- --salesforce-id=a052o00001Agr0lAAB --describe --out=./tmp/inspect.json
```

**Pull vs import:** `--id` + `--salesforce-id` updates an existing Medusa product. Omit `--id` to **create** a new Medusa product from Salesforce (idempotent when that SF id was imported before — re-pull updates the linked product). New products are created as **draft** with one default variant.

Or: `npx medusa exec ./src/scripts/sync-salesforce.ts -- <args>`.

## Debugging and test helpers

Medusa does **not** log third-party HTTP automatically. This connector adds:

| Mechanism | Purpose |
|-----------|---------|
| `SALESFORCE_DEBUG_HTTP=1` (or `true` / `yes`) | Logs each **REST** call: method, API path, JSON request body (truncated), response status, optional `Sforce-Limit-Info`, response body (truncated). |
| `SALESFORCE_DEBUG_HTTP_BODY_MAX` | Max chars logged per body (default `4000`, cap `200000`). |
| OAuth token `POST` | Logged with **assertion redacted**; **successful token responses omit the body** so `access_token` is never written. Errors log `error` / `error_description` only. |
| `npm run salesforce:parse-sample` | Loads `src/modules/salesforce-sync/samples/query-response.example.json` (fixture shaped like a SOQL query response) and validates parsing — **no Salesforce credentials**. |
| `npx medusa exec ./src/scripts/sync-salesforce.ts -- --probe --probe-verbose` | After a live probe query, prints the parsed result JSON (truncated at 12k chars). Combine with `SALESFORCE_DEBUG_HTTP=1` to see raw HTTP as well. |
| `npx medusa exec ./src/scripts/verify-productgroup-import.ts` | Live acceptance test for `a05Mz00000YEMptIAH`: double import (idempotency), future-date guard, categories, prices, event items. Requires Salesforce credentials. |
| `npm run salesforce:inspect -- --url=<Productgroup_URL__c>` | `FIELDS(ALL)` dump of `vaProductgroup__c` + child `vaProduct__c` records; highlights docent/embed-related fields. Optional `--describe`, `--out=path.json`. Script: `src/scripts/inspect-salesforce-productgroup.ts`. |
| `npm run salesforce:inspect-order -- --medusa-id=order_...` | Dump Salesforce `Order`, `OrderItem`, `Registration__c`, `Voucher__c` for a synced order. Also `--display-id=N` or `--order-nr=N`. Script: `src/scripts/inspect-salesforce-order.ts`. |

Use debug flags only in **local/staging**; noisy logs may include PII from Salesforce payloads.

## DB

Module table `salesforce_sync_state`: generated migration under `src/modules/salesforce-sync/migrations/`. Apply with Medusa CLI:

```bash
npx medusa db:migrate
```

## Customers (Person Accounts)

Salesforce **Person Accounts** (`Contact` + `Account`, `IsPersonAccount = true`) sync with Medusa customers. The match key is the Salesforce **Contact Id** (`003…`) stored in `salesforce_sync_state.salesforce_id`; the linked **Account Id** (`001…`) is stored in `salesforce_account_id`.

| Direction | Trigger | Behaviour |
|-----------|---------|-----------|
| SF → Medusa | OTP/password login, `POST /store/customer/me/sync-from-salesforce`, webhook, bulk import, admin pull | Pull Contact fields + default shipping address + marketing metadata |
| Medusa → SF | `customer.created` / `customer.updated`, `POST /store/customer/me/push-to-salesforce` (after registration/address save) | **Create:** `POST Account` (`PersonMailing*`, `PersonBirthdate`, …) + `PATCH Contact` (`Mailing*`, `Birthdate`). **Update:** split `PATCH Account` (profile / address) + `PATCH Contact`. Birthdate stored in Medusa as `metadata.sf_birthdate` (ISO `YYYY-MM-DD`). |

**Field map** (`mappings/customer.ts`): name, email, phone, mailing address (Account `PersonMailing*` + `Billing*` + `Shipping*`, Contact `Mailing*`), `Same_account_address__c` (= true when website uses one address for billing/shipping), salutation/initials/birthdate/IBAN (metadata), newsletter/magazine/editorial/opt-in flags (metadata). **Push:** `Newsletter__c` is written when `metadata.sf_newsletter === true` (e.g. waitlist signup). Country codes map NL/BE/DE ↔ Salesforce labels via `utils/country-code.ts`.

**Bulk import:** `npm run salesforce:import-customers` — SOQL `Contact WHERE IsPersonAccount = true AND Active__c = true AND Email != null`. Flags: `--dry-run`, `--limit=N`, `--all` (omit Active filter). Creates Medusa customers **without passwords** (OTP login). **Do not run full import until reviewed.**

**Registration push** requires `SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID` (customer Person Account record type, not Teacher). Staging sandbox Participant: `0121t000000QIr0AAG`. If this env var is missing, customer create fails (`SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID must be set…`) and the order push then fails with `has no Salesforce Person Account link after push` — the order stays in Medusa only. Set the var, reload Medusa, then `npm run salesforce:push -- --type=order --action=push --display-id=N`.

## Orders (Medusa → Salesforce)

Push runs on **`order.completed`** (paid / zero-total checkout). Workflow: `push-order-salesforce` — ensure customer Person Account → **Order** (Draft) → **Registration__c** + **OrderItem** lines → **Voucher__c** (gift cards) → activate Order.

| Medusa | Salesforce object | Notes |
|--------|-------------------|--------|
| Order header | `Order` | `Website_Order__c`, `Order_Origin__c: Website`, `Payment_Method__c` (`IDEAL`, `CREDITCARD`, `PAYPAL`, `BANCONTACT`, `GIFTCARD`, `KLARNA`, `GRATIS`), `Ideal_Transaction_Id__c` (Mollie). After lines: `Product__c` (vaProduct), `Registration__c`, `Product2__c` from the first seat (Lightning header lookups). |
| Event line (per seat) | `Registration__c` + product `OrderItem` | Links `vaProduct__c` via variant sync state; `Status__c: Ingeschreven`; `Order_Item__c` points at the product `OrderItem`. Writable name on the line is `ProductName__c` (`Product_Name__c` / `Is_Discount__c` are formulas). |
| Waitlist signup (sold-out PDP) | `Registration__c` only | `POST /store/events/:handle/waitlist` — no order; `Status__c: Wachtlijst`; `Number_Of_People__c`; customer `Newsletter__c` pushed when `metadata.sf_newsletter` is true. |
| Promotion discount | discount `OrderItem` | Negative `UnitPrice`, `ProductName__c: Korting`, `Discount_Code__c`, same `Registration__c` |
| Gift card purchase | `OrderItem` + `Voucher__c` | `Giftcard_*` fields; voucher sync state `entity_type: voucher` |
| Gift card redemption | voucher `OrderItem` | negative amount, `Voucher__c` lookup |

**Requirements:** customer must exist in Medusa (checkout login); event variants must have been imported from Salesforce (`salesforce_sync_state` variant → `vaProduct__c`). Amounts: order graph fields (`unit_price`, `total`, adjustments) are in **major EUR**; the loader converts to cents, then mappings write SF major units (`centsToMajorEur`). When `order.total` is `0` in the graph API, the loader derives the total from line items.

With `SALESFORCE_MEDUSA_CUSTOM_FIELDS=false`, re-pushes resolve existing `Registration__c` / `OrderItem` rows via `salesforce_sync_state` only (not “first row for this vaProduct”) so extra seats stay separate. New `OrderItem` rows on an already **Activated** order set the header back to **Draft** first; the activate step then re-activates.

**Manual push / inspect:**

```bash
npm run salesforce:push -- --type=order --action=push --id=order_...
npm run salesforce:push -- --type=order --action=push --display-id=6
npm run salesforce:push -- --type=order --action=push --order-nr=6   # alias for --display-id
npm run salesforce:inspect-order -- --medusa-id=order_...
npm run salesforce:inspect-order -- --display-id=6
npm run salesforce:inspect-order -- --salesforce-id=801...
```

Mappings: `mappings/order.ts`, `order-item.ts`, `registration.ts`. Loader: `load-order-push-data.ts`.

## Out of scope (current)

- Pull **variant** from Salesforce into Medusa (product-level import only; product groups import variants via `vaProduct__c`).
- Bidirectional product sync; admin UI for editing mappings.
- Salesforce → Medusa order pull beyond header email/status stub.
- Medusa tax-region wiring for Salesforce VAT (stored as metadata only for now).

## Product group import (`vaProductgroup__c`)

Vrije Academie product groups are **`vaProductgroup__c`** (prefix `a05…`); child occurrences are **`vaProduct__c`** (`a04…`, lookup `Productgroup__c`). Standard **`Product2`** import remains available for legacy/simple products.

**Workflow:** `pull-productgroup-salesforce` — fetch group + children, apply Medusa product / event group / categories / variants / event items / media / sync state, then Sanity mirror.

**Visibility:** Salesforce **Zichtbaar op Website** on the **product group** (`Visible_on_website__c`) is the catalog gate. Unchecked (`false`) groups are **not imported**; already-imported ones are **drafted**. Hidden **child products** (`Visible_On_Website__c` unchecked, or **Externe verhuur** record type / name) are omitted as sessions — the group still lists **without upcoming events**. Missing/null checkboxes stay visible so a field rollout does not hide the catalog.

To unpublish products already on the site after this change, run a bulk import once (`npm run salesforce:import-future` or `import-all`). Already-imported hidden groups are still processed (not skipped) so they can be drafted. Then flush listing snapshots on the Medusa host: `npm run cache:flush` (same `REDIS_URL` as the server). Without that, the PDP 404s (live product status) while `/agenda` can keep showing the old occurrence until the snapshot TTL (up to 60 min).

Imported groups that **are** visible are **published**. `EventGroup.show_in_plp` still defaults to **`false`** (admin flag, currently ignored on the storefront). Enable that flag one product at a time: `npx medusa exec ./src/scripts/enable-show-in-plp.ts -- {handle}`. Enable all Salesforce imports: `npx medusa exec ./src/scripts/enable-show-in-plp.ts -- --all-sf`.

**Pricing:** Salesforce gross price is source of truth (`Price__c` on each `vaProduct__c`, e.g. `19.5` → EUR `19.5` on the variant — Medusa v2 major currency units).

**Organization:** imported products are linked to the **default sales channel**, get a Medusa **product type** from `Productgroup_Record_Type_Developer_Name__c` (e.g. `Lezing`), and **categories** from `Productgroup_Subject__c` (native Medusa categories + catalog category links for storefront/Sanity). **Docenten** are resolved from `Highlighted_Teacher__c` (+ `Highlighted_Teacher__r.Name` when readable); when the related Account is not accessible, the name is parsed from `Samenvatting__c` / `Productgroup_Description__c` (e.g. “Frederike Upmeijer”). Linked via `product-docenten`; sync state entity type `docent`. Per-session city, location, and docent are stored on each `EventItem` as `catalog_city_id`, `catalog_location_id`, and `docent_id` (resolved during import via `resolveEventItemFacetIdsFromSalesforce`). Logic: `utils/link-docent-from-salesforce.ts`.

**External registration (reizen):** Medusa stores the product-group URL as `metadata.salesforce_external_registration_url` (`External_Registration_URL__c`) and each child URL on the variant (`External_Registration_URL_Product__c`). Sanity `externalRegistrationUrl` is the group URL, or the first child URL when the group field is empty. Storefront: `GET /store/events/:handle` exposes `external_registration_url` on the event and on each variant (child URL, else group). PDP session **Direct inschrijven** opens that variant’s URL; the booking panel does the same when all sessions share one URL.

**Manual import:**

```bash
npm run salesforce:pull -- --type=productgroup --action=pull --salesforce-id=a05Mz00000YEMptIAH
# or
curl -X POST /admin/salesforce/productgroups/import -d '{"salesforce_id":"a05Mz00000YEMptIAH"}'
```

**Webhooks:** `POST /hooks/salesforce` with batched payload `{ object_type, method, ids[] }`. Supported `object_type` values in v1:

| SF `object_type` | Resolved entity | Action |
|------------------|-----------------|--------|
| `Account` | `customer` or `docent` (RecordTypeId + sync state) | Pull |
| `Contact` | `customer` | Pull |
| `Order` | `order` | Pull when linked |
| `Product2` | `product` / `variant` | Pull / import |
| `vaProductgroup__c` | `productgroup` | Pull (+ linked-online parents) |
| `vaProduct__c` | parent `productgroup` | Pull parent group |

`method: delete` — soft-archive (`draft` product / `is_active=false` docent) for **product**, **productgroup**, **docent** only; **customer** and **order** deletes are logged as `skipped` (no destructive action). Unsupported types (`OrderItem`, `Registration__c`, `Voucher__c`, …) are logged and skipped. Auto-import uses the **future-only guard** and **Zichtbaar op Website** (see below). Manual CLI/API ignores the date guard but still skips hidden groups.

Mappings: `src/modules/salesforce-sync/mappings/productgroup.ts`, `course-product.ts`. Core logic: `import-productgroup.ts`.

### Linked Online Productgroup (`Linked_Online_Productgroup__c`)

Some offline product groups (e.g. studiedag) reference a separate **`vaProductgroup__c`** for Zoom sessions (`Online Lezing` / `Live_College`). On import:

- Direct children (`Productgroup__c` = parent) and linked children (`Productgroup__c` = `Linked_Online_Productgroup__c`) are **merged** onto the parent Medusa product (deduped by child SF `Id`).
- Linked children use the **linked group’s** record type for `inferDeliveryType` (`Product_City__c` = `"Online"` → `delivery_type: online`, no `EventItem.city`).
- Parent metadata: `salesforce_linked_online_productgroup_id`.
- The linked online group is still imported as its **own** hidden product (`show_in_plp=false`, `salesforce_is_linked_online_slave=true` when referenced by a parent). Slave variants use SKU prefix `sf-slave-{childId}` and namespaced sync keys so they do not collide with merged parent variants (`sf-{childId}`).
- `Productgroup_URL__c` handles are normalized (e.g. `online---studiedag-…` → `online-studiedag-…`) to satisfy Medusa handle rules.
- Webhooks on the linked group or its `vaProduct__c` rows also re-import parent groups that reference it.

### VAthuis (`Lezingen_Thuis`, `Thuis_College`)

Salesforce record types **`Lezingen_Thuis`** and **`Thuis_College`** map to on-demand video bundles (one purchasable `vaProduct__c` variant). During import:

- **`EventGroup.record_type`** → `vathuis` (excluded from Ons aanbod / Agenda; listed via **`GET /store/vathuis`**)
- **`EventItem.delivery_type`** → `pre_recorded` (no session date/city)
- **`EventItem.available_quantity`** — always unlimited on import; VA Thuis colleges cannot sell out (see `src/lib/vathuis-availability.ts`)
- **`metadata.vathuis`** — chapters + episodes fetched from Audience Player (`Audience_Player_Article_Id__c` on the child product), plus `purchase_mode: bundle_only`
- **`metadata.vathuis.chapters[]`** — each Audience Player season → `{ number, title, episodes[] }` (e.g. “1. Inleiding”, “2. Engeland”)
- **Episode preview** — first episode of chapter 1 gets `preview_available: true`. Playback config (SDK + token) is fetched at runtime via `GET /store/events/:handle/episodes/:episodeKey/preview-playback`.
- Optional env: `AUDIENCE_PLAYER_PROJECT_ID` (default `14`), `AUDIENCE_PLAYER_API_URL`, `AUDIENCE_PLAYER_CLIENT_ID`, `AUDIENCE_PLAYER_CLIENT_SECRET`, `AUDIENCE_PLAYER_PREVIEW_EMAIL`

Storefront: `GET /store/events/:handle` exposes `purchase_mode`, `bundle_variant_id`, `vathuis.chapters`, `vathuis.episodes`, and `vathuis.audience_player`. PDP shows a chapter dropdown, episode table (aflevering / duur / beschrijving), **Bekijk aflevering** (preview modal with iframe) or **Koop alle lessen** per row, plus the bundle CTA in `PdpBookingPanel`.

**Purchase access:** see `medusa/docs/VATHUIS_ACCESS.md` — 3-month entitlement after completed order; full embed URLs only via authenticated customer API.

### Future-only auto-sync

Webhooks enqueue product group pulls with `manual: false`. Import is **skipped** when:

- `Visible_on_website__c` is unchecked on the group, or the group is **Externe verhuur** (`skipReason: not_visible_on_website` — including manual CLI/API; already-imported products are drafted). Hidden children do not hide a visible group. Bulk CLI still **enqueues** already-imported hidden groups so they are removed from the storefront.
- `Latest_Product_Start_Date__c` is in the past, or
- all child `Start_date_time__c` values are in the past (when latest start is unset) (`skipReason: past_dates`).

**Exceptions:** VAthuis record types (`Lezingen_Thuis`, `Thuis_College`) always import when visible (on-demand). Bulk CLI also includes online-only groups (see `shouldBulkImportProductgroup`).

Manual CLI/API imports **ignore** the date guard, not **Zichtbaar op Website**. Logic: `shouldImportProductgroup()` in `src/modules/salesforce-sync/utils/future-import-guard.ts`.

**Bulk historical import:** `npm run salesforce:import-all` (or `import-future-productgroups.ts -- --all`) imports **every** `vaProductgroup__c` with `manual: true` (no date filter). Use `--dry-run` and `--limit=N` first. VAthuis imports call Audience Player per group and can take a long time on a full catalog.

### Bulk import performance

Bulk CLI scripts (`import-future`, `import-linked-vathuis`, `import-all`) prefetch Salesforce data up front (all groups + chunked child queries) and call `importProductgroupFromSalesforce` directly instead of re-fetching per group via the pull workflow.

| Flag | Default | Purpose |
|------|---------|---------|
| `--concurrency=N` | `1` | Import up to N product groups in parallel (Salesforce + Medusa only). Sanity mirroring runs once after the pool. With batched Sanity sync and import caches, **8–10** is usually safe — watch Salesforce 429s or DB load. |
| `--skip-search` | off | Skip per-product OpenSearch reindex during import; reindex imported products once at the end. Or run `npm run search:reindex` afterward. |
| `--skip-unchanged` | off | Skip product metadata when Salesforce fingerprint matches; **session location/docent facets are still refreshed** from child rows. |
| `--since=<ISO>` | off | Only fetch groups (and parents of modified children) with `SystemModstamp >= since`. Already-imported Salesforce ids missing from that window are still loaded so hidden products can be drafted. Example: `--since=2026-03-01T00:00:00.000Z`. |
| `--limit=N` | unlimited | Stop after N import attempts (after guard filtering). |
| `--dry-run` | off | List candidates only. |

During bulk import the CLI sets `SALESFORCE_SUPPRESS_PUSH=1` (no push-back to Salesforce) and `SALESFORCE_SUPPRESS_SANITY_SYNC=1` (defers all Sanity subscribers). After all groups are imported, **batched Sanity passes** run for products, then categories/docenten:

1. Products: chunked GROQ reads + `client.transaction()` writes (default 50/chunk), diff-before-write.
2. Related entities: unique catalog categories, native categories, and docenten mirrored once each.

**Import caches** (one `BulkImportContext` per run): shipping profile, sales channel, product types, category lists, teacher SF profiles, linked-online parent map, variant sync states, docent link locks per product.

Sanity mutate limits: **25 req/s per IP**, **4 MB per mutate request** ([Sanity technical limits](https://www.sanity.io/docs/content-lake/technical-limits)).

VAthuis groups remain slower (Audience Player HTTP per group); concurrency overlaps that I/O.

**Incremental re-sync** (after Salesforce edits to location, teacher, etc.):

```bash
npm run salesforce:import-all -- --since=2026-03-01T00:00:00.000Z --skip-unchanged --skip-search --concurrency=8
```

Replace the ISO timestamp with when you last synced (or the date of your Salesforce bulk update).

**Backfill session location/docent** (after deploying `event_item` facet fields):

```bash
npm run salesforce:backfill-facets -- --concurrency=10
```

This skips unchanged product metadata but **always refreshes** session location/docent from Salesforce child rows. Variant lookup falls back to `sf-{salesforceChildId}` SKU when sync state is missing.

```bash
npm run salesforce:backfill-facets -- --concurrency=8
npm run salesforce:audit-facets   # check coverage after
```

After deploying `Order__c` → `salesforce_order`, re-import product groups so PLP default sort is populated: `npm run salesforce:import-all -- --skip-search --concurrency=5` (or a narrower import). Products without `salesforce_order` sort last until re-imported.

Utility: `prefetch-productgroups-for-import.ts`, `run-pool.ts`, `batch-sync-products.ts`.

The **storefront** also hides past occurrences (`GET /store/events`, `GET /store/agenda` unless `include_past=true`).

### Product group field map (`vaProductgroup__c`)

Example record `a05Mz00000YEMptIAH` (*Lezing Amrita Sher-Gil*):

| Business field | Salesforce API | Medusa / Sanity target |
|----------------|----------------|-------------------------|
| Product group name | `Name` | `Product.title` |
| Handle / URL slug | `Productgroup_URL__c` | `Product.handle` |
| Group price | `Productgroup_Price__c` | metadata `salesforce_group_price`; fallback variant price when no children |
| Net price | `Net_Price__c` | — (not imported) |
| VAT rate | `VAT_Rate__c` | metadata `salesforce_vat_rate` (tax regions not wired) |
| Onderwerp (categories) | `Productgroup_Subject__c` (`;`-separated) | native `category_ids` + catalog category links → Sanity `categories` |
| Record type | `Productgroup_Record_Type_Developer_Name__c` | `EventGroup.record_type` + Medusa `product.type` (`Lezingen_Thuis` / `Thuis_College` → `vathuis`) |
| Linked online catalog | `Linked_Online_Productgroup__c` | merged child variants on parent; metadata `salesforce_linked_online_productgroup_id` |
| Zichtbaar op Website | `Visible_on_website__c` | Skip import / draft when unchecked; **Externe verhuur** groups always hidden |
| Child zichtbaar op website | `Visible_On_Website__c` | Session omitted when unchecked or **Externe verhuur**; group can still list with no upcoming events |
| PLP admin flag | — | `EventGroup.show_in_plp=false` (linked-online slave groups always hidden) |
| Sales channel | — | default store sales channel |
| SEO title | `SEO_Title__c` | metadata → Sanity `seoTitle` |
| SEO meta description | `SEO_Meta_Description__c` | metadata → Sanity `seoDescription` |
| Thumbnail | `Primary_1_Url__c` | `Product.thumbnail` → Sanity `thumbnailUrl` |
| Gallery | `Image_1_Url__c` … `Image_4_Url__c` | `Product.images` → Sanity `imageUrls`; store `image_urls` / `gallery_images` |
| Gallery captions | `Image_1_Source__c` … `Image_4_Source__c` (Afbeelding N Tekst) | `Product.metadata.salesforce_gallery_images` → Sanity `imageCaptions`; store `gallery_images[].caption` (PDP hover) |
| Short / PDP description | `Productgroup_Description__c` | `Product.description` (plain text) |
| Web body / trigger / description HTML | `Productgroup_Web_Body__c`, `Productgroup_Web_Trigger__c`, `Productgroup_Description__c` | metadata → Sanity `body` (quote, section titles, bullet footer) unless `pageBodyOwnedBySanity` |
| Subtitle | `Productgroup_Subtitle__c` | metadata `salesforce_subtitle` |
| Product card CTA bar | `CTA_Label__c`, `CTA_Color__c`, `CTA_Color_Hover__c` | metadata `salesforce_cta_*` → store `badge`, `cta_color`, `cta_color_hover`; Sanity `badge`, `ctaColor`, `ctaColorHover`; PLP card bar in `PlpEventCard` |
| Catalog sort order | `Order__c` | metadata `salesforce_order` → default PLP / VA Thuis sort (`sort=order`, ascending; nulls last) |
| Child products | `vaProduct__c` (lookup `Productgroup__c`) | `ProductVariant` + linked `EventItem` |
| Occurrence start / end | `Start_date_time__c`, `End_date_time__c` | `EventItem.start_at` / `end_at` |
| Occurrence price | `Price__c` | variant EUR price → Sanity `priceFrom` |
| Occurrence city | `Product_City__c` | `EventItem.city` / `city_slug` + `catalog_city_id` |
| Occurrence location / venue | `Product_Location_Name__c`, `Account__c`, `Account__r.Name`, `Product_Location_Room__c`, `Product_Location_Room_Name__c` | `EventItem.location_name` + `catalog_location_id` |
| Capacity / free trial | `Capacity__c`, `Free_Product__c` | `EventItem.available_quantity`, `is_free_trial` |
| Latest start (group) | `Latest_Product_Start_Date__c` | future-only auto-import guard |
| VAthuis episodes label | `Audience_Player_Episodes__c` | `metadata.vathuis.episode_count_label` |
| VAthuis play time | `Audience_Player_Play_Time__c` | `metadata.vathuis.play_time` |
| Audience Player article / product | `Audience_Player_Article_Id__c`, `Audience_Player_Product_Id__c` on child | chapter/episode fetch + `metadata.vathuis.audience_player` |
| Highlighted docent | `Highlighted_Teacher__c`, `Highlighted_Teacher__r.Name`, `Highlighted_Teacher_Teaser__c`, `Highlighted_Teacher_Image__c` | `metadata.salesforce_highlighted_teacher_id`, `Docent` + `product-docenten` link (name fallback from `Samenvatting__c` / `Productgroup_Description__c`). Store API exposes `highlighted_instructor` for the PDP booking panel when this field is set. When the linked **Account** is readable, maps `Web_Body__c` (HTML stripped to plain text) → `bio`, else `Description`; `Web_Primary_1_Url__c` → `photo_url`, else a usable `PhotoUrl`; `PersonTitle` → `role` (`utils/fetch-teacher-account.ts`). Salesforce session-relative `PhotoUrl` paths (e.g. `/services/images/photo/001...`) are dropped (`utils/photo-url.ts`). Mirrored to Sanity `docent` on `people.docent.*` events. |
| Variant instructor | Child `Account_Teacher__c`, `Account_Teacher__r.Name`, `Main_Teacher_Name__c` | `EventItem.instructor_name` / `instructor_salesforce_id` + `docent_id` |
| Preview / iframe | `Audience_Preview_Url__c`, `IFrame_URL_1__c` on group | first-episode `embed_url` in `metadata.vathuis.episodes[]` |
