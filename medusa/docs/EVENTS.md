# Event domain (Medusa)

## Vocabulary

| Domain term | Medusa entity | Module entity |
|-------------|---------------|---------------|
| **Product Group** | `Product` | `EventGroup` (1:1) |
| **Product** (purchasable instance) | `ProductVariant` | `EventItem` (1:1) |

Admin UI and docs use domain wording; APIs and DB keep Medusa names.

## `events` module

- **`EventGroup`**: `record_type` — `collegereeks` | `lezing` | `excursie` | `studiedag` (extend via `RECORD_TYPES` in `src/modules/events/types.ts`); **`has_free_trial`** (boolean, default `false`); **`show_in_plp`** (boolean, default `true`) — when `false`, the product is omitted from **`GET /store/events`** (Ons aanbod) and **`GET /store/agenda`**. The storefront also always excludes the configured digitale cadeaubon product handle (`GIFT_CARD_PRODUCT_HANDLE` / default `digitale-cadeaubon`).
- **`EventItem`**: `delivery_type` — `online` | `offline` | `pre_recorded`; **`available_quantity`** (non-negative integer); **`start_at`** / **`end_at`** (timestamptz nullable); **`city`** (text nullable); **`registration_deadline_at`** (timestamptz nullable — hard registration cutoff); **`is_free_trial`** (boolean, default `false` — marks this variant as a free taster session).
- **VAthuis bundles** (`Lezingen_Thuis`, `Thuis_College` from Salesforce): one purchasable variant; chapters + episodes in `Product.metadata.vathuis` (Audience Player on import). Store API adds `purchase_mode`, `bundle_variant_id`, `vathuis.chapters`, `vathuis.episodes`. PDP: `PdpEpisodesTable` (chapter dropdown, preview modal) + bundle CTA. Docenten sync from `Highlighted_Teacher__c` on import.
- **`Property`**: `key`, `value` (text). Linked to a **Product Group** *or* a **Product** (variant), not both; enforced in admin API.

`day_part` (`ochtend` / `middag` / `avond`) is derived from `EventItem.start_at` hour in the API layer (not stored).

Module path: `src/modules/events/`. Links: `src/links/` (`product-event-group`, `variant-event-item`, `product-properties`, `variant-properties`).

## Availability

- **Source of truth** for seats/capacity: `EventItem.available_quantity`.
- **Decrement**: subscriber on **`order.completed`** only (`decrement-available-quantity.ts`). Quantity subtracted per line item; floored at `0`.
- **No cart reservation** and **no hard block** when `available_quantity` is `0` (storefront can enforce separately).
- **Medusa inventory**: event variants use **`manage_inventory: false`**. Set when an `EventItem` is linked (admin PATCH) and enforced by `ensure-event-variant-no-medusa-inventory.ts` if a linked variant is toggled in Admin.

## Admin

- Widgets: `src/admin/widgets/` — Product Group (`record_type`, **`has_free_trial`**, **`show_in_plp`**, **categories**, **docenten**, properties), variant **Product** (`delivery_type`, `available_quantity`, **`start_at`**, **`end_at`**, **`city`**, **`registration_deadline_at`**, **`is_free_trial`**, properties).
- API: `/admin/events/*` (variants, properties), `/admin/catalog/*` (categories), `/admin/people/*` (docenten). All authenticated with Zod validation.

## Store API

- `GET /store/events` — Product Groups. Supports: `q`, `record_type[]`, `product_type[]` (reis | studiedag | wandeling | workshop), `delivery_type[]`, `category[]`, `docent[]`, `city[]`, `day_part[]`, `period_start`, `period_end`, `sort`, `limit`, `offset`, legacy `property[key]=value`. Returns `{ events, count, facets }` including `facets.product_type`. **Listing rules**: excludes the gift-card product handle (see above); excludes any product whose `EventGroup.show_in_plp` is `false`; excludes **on-site-only** products when every offline `event_item` has `start_at` in the past (online / pre_recorded products are not date-filtered). **Aggregates** (`cities`, `earliest_start_at`, `day_part_of_earliest`, city/day_part facets) use **future offline sessions only**.
- `GET /store/events/:handle` — single product by handle with full enrichment: `tags`, `variants.prices`, `images`, `categories`, `instructors`, computed `has_free_trial`, `image_urls`, `price_from`, `min_available_quantity`, etc. **Prices** in JSON responses are integer **cents** (Medusa stores major EUR units internally; converted in `src/lib/medusa-price-to-cents.ts`).
- `GET /store/events/:handle/similar` — up to 4 **related** products in the same `catalog_category` (excluding the current product). Candidates must pass the same listing rules as `/store/events` (gift card + `show_in_plp`), have at least one **future** `event_item` (`start_at >= now`, or no `start_at` for on-demand) with `available_quantity > 0`. Sorted by completed-order line-item quantity (registrations); when no registration signal exists, order is **random**. Returns `{ similar: EventCard[] }`. Hidden on the frontend when fewer than 2 results.
- `GET /store/agenda` — flattened **event occurrences** (one row per `event_item`) for the Agenda page. Uses the same product-level listing rules as `/store/events` (gift card + `show_in_plp`). Supports the same filters as `/store/events` plus `date` (YYYY-MM-DD, single-day) and `include_past` (default excluded). Sort: `start_date` (asc, default), `start_date_desc`, `price_asc`, `price_desc`. Returns `{ items, count, facets }` where each item includes `start_at`, `end_at`, `city`, `delivery_type`, `available_quantity`, `price`, `product_handle`, `product_title`, and a derived `status` (`open` / `almost_full` (≤3 left) / `waitlist` (0 left) / `exclusief` (product has a tag containing "exclusief"))).
- `GET /store/cart/extras?cart_id=…` — per-line-item enrichment for the cart page. Resolves variant → `event_item` (session date/time/city/delivery_type) and product → instructors. Returns `{ extras: CartItemExtra[] }`. Requires `x-publishable-api-key` header.

## `catalog` module

- **`Category`**: `slug`, `label`, `sort_order`, `image_url`, `color`.
- Links: `product_product_catalog_catalog_category` (Product ↔ Category, many-to-many via pivot).
- Admin: `/admin/catalog/categories` (CRUD), `/admin/catalog/product-groups/:productId/categories` (attach/detach).

## `people` module

- **`Docent`**: `slug`, `name`, `role`, `photo_url`, `bio`, `subject_tags` (jsonb).
- Links: `product_product_people_docent` (Product ↔ Docent, many-to-many via pivot).
- Admin: `/admin/people/docenten` (CRUD), `/admin/people/product-groups/:productId/docenten` (attach/detach).

## Sanity sync

All Medusa entities are mirrored to Sanity automatically. See [SANITY_SYNC.md](./SANITY_SYNC.md).

Legacy **`metadata.eventType`**, **`metadata.capacity`**, and similar are **not** used for listing or semantics.

## Salesforce sync

Customers, completed orders, and new products/variants sync to Salesforce (JWT bearer REST); inbound webhooks can pull updates back. Details: [SALESFORCE_SYNC.md](./SALESFORCE_SYNC.md).

## Out of scope (current)

Salesforce-driven property import, reservations / lesson scheduling, and other items noted in [OPEN_POINTS.md](./OPEN_POINTS.md).

## References

- [README](./README.md) — setup and workflow
- [OPEN_POINTS.md](./OPEN_POINTS.md) — future work

---

## Custom Store API Routes

### `GET /store/cart/extras?cart_id=…`

Returns per-line-item enriched data (thumbnail, event_item, instructor names). See CART.md.

### `GET /store/customer/exists?email=…`

Returns `{ exists: boolean }`. Used by `CheckoutLoginForm` to determine the email-first flow branch. No PII beyond the boolean is exposed.

### `GET /store/payment/providers?amount=…&currency=EUR`

Returns `{ methods: [{ id, name, imageUrl }] }` from the Mollie payment provider. `amount` is in **cents** (integer). Used by `CheckoutPaymentForm` to render payment method tiles.

### `POST /hooks/payment/pp_mollie_mollie`

Built-in Medusa payment webhook endpoint. Mollie calls this with a payment ID; Medusa's payment module calls `MolliePaymentProviderService.getWebhookActionAndData` which fetches the payment status and maps it to a Medusa `WebhookActionResult`. On `authorized` or `captured` the cart is completed and an order is created. Set `MOLLIE_WEBHOOK_URL=https://your-domain/hooks/payment/pp_mollie_mollie` in `medusa/.env`.
