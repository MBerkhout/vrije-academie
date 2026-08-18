# VA Thuis purchase access

Customers who buy a VA Thuis bundle get **3 calendar months** of access to all episodes, counted from the order completion date.

## Data model

Module: `src/modules/vathuis-access/`  
Table: `customer_vathuis_access`

| Field | Purpose |
|-------|---------|
| `customer_id` | Medusa customer |
| `product_id` | VA Thuis product |
| `product_handle` | Denormalized for listing |
| `order_id` / `order_line_item_id` | Source order line (idempotency) |
| `granted_at` | Order `created_at` when access was granted |
| `expires_at` | `granted_at + 3 months` |

One row per `(customer_id, product_id)`. Repurchasing the same bundle extends `expires_at` to `max(existing, new_grant + 3 months)`.

## Granting access

Subscriber: `src/subscribers/vathuis-access-order-completed.ts` on `order.completed`.

Skips gift-card lines. Only products with `event_group.record_type === 'vathuis'` and `metadata.vathuis.purchase_mode === 'bundle_only'`.

## Store APIs (authenticated)

| Endpoint | Response |
|----------|----------|
| `GET /store/customer/me/vathuis-access` | `{ items: VathuisAccessItem[] }` |
| `GET /store/customer/me/vathuis-access/:handle` | `{ hasAccess, grantedAt, expiresAt }` |
| `GET /store/customer/me/vathuis-access/:handle/episodes/:episodeKey/embed` | `{ playback: AudiencePlayerPlaybackConfig }` — `episodeKey` = `{chapter}-{episode}` |
| `GET /store/events/:handle/episodes/:episodeKey/preview-playback` | `{ playback: AudiencePlayerPlaybackConfig }` — OAuth token for preview via `AUDIENCE_PLAYER_PREVIEW_EMAIL`; only when `preview_available: true` |

Preview and purchased episodes both use the **embed-player SDK** in the frontend modal. Autoplay requires `play()` to run in the same user-gesture chain as the click (see Audience Player embed-player README).

Public `GET /store/events/:handle` may still expose tenant `/_embed/video-player` URLs in `embed_url` for reference; the storefront modal does not iframe them.

## Salesforce alignment

`load-order-push-data.ts` sets for `pre_recorded` lines:

- `Product_Start_Date__c` = order `created_at`
- `Product_End_Date__c` = order `created_at + 3 months`

## Backfill

```bash
npx medusa exec ./src/scripts/backfill-vathuis-access.ts
npx medusa exec ./src/scripts/backfill-vathuis-access.ts -- --dry-run
npx medusa exec ./src/scripts/backfill-vathuis-access.ts -- --limit=100
```

## Migration

```bash
npm run migrate:run
```

Creates `customer_vathuis_access` via `Migration20260709180000`.
