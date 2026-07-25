# Analytics & GTM

Client-side tracking via Google Tag Manager (`dataLayer`) and server-side `purchase` via sGTM (Medusa).

## Environment

**Frontend** (`frontend/.env`):

```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_COOKIE_BOT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_GTM_ENABLED=true   # set false locally to disable pushes
NEXT_PUBLIC_SITE_URL=https://www.vrijeacademie.nl
```

**Medusa** (`medusa/.env`):

```bash
SGTM_ENDPOINT_URL=https://your-sgtm.example/collect
SGTM_PURCHASE_SECRET=optional-bearer-token
```

## Architecture

- [`src/lib/analytics/`](../src/lib/analytics/) — types, mappers, `pushEvent`, `track*` helpers
- [`src/components/analytics/`](../src/components/analytics/) — GTM/Cookiebot bootstrap, providers, list context
- [`medusa/src/lib/gtm/`](../../medusa/src/lib/gtm/) — server-side purchase payload + HTTP sender
- [`medusa/src/subscribers/gtm-purchase-order-completed.ts`](../../medusa/src/subscribers/gtm-purchase-order-completed.ts) — fires on `order.completed` (idempotent via `order.metadata.gtm_purchase_sent_at`)

Consent defaults to **denied**; Cookiebot callbacks push `consent_update` with Consent Mode v2 fields.

## Item mapping

| Field | Source |
|-------|--------|
| `item_id` | product `handle` (cadeaubon → `cadeaubon`) |
| `item_name` | `title` |
| `item_category` | first category label |
| `item_category2` | `record_type` / `product_type` |
| `item_variant` | `{city} - {date} - {time}` from `event_item` |
| `price` / `value` | cents → EUR major units |

`user_data` is filled when known (email, phone, name, postal code, country).

## Events (checklist)

| Event | Where |
|-------|--------|
| `page_view` | `PageViewTracker` (route + `page_type`) |
| `consent_update` | Cookiebot adapter |
| `search` | PLP live search, `/zoeken` |
| `view_item_list` / `select_item` | PLP, agenda, homepage carousels (`ItemListProvider`) |
| `view_item` | PDP / VA Thuis PDP (`ViewItemTracker`) |
| `add_to_cart` | `addVariantToCart()` |
| `view_cart` / cart mutations | `CartView` |
| `begin_checkout` | `ProceedCta` |
| `add_payment_info` | `CheckoutPaymentForm` submit |
| `purchase` | **server** Medusa → sGTM only |
| `add_to_wishlist` | `useWishlist` |
| `view_promotion` / `select_promotion` | `HeroBlock` |
| `filter_change` / `sort_change` | PLP sidebar / sort |
| `checkout_step_view` | `CheckoutStepTracker` |
| `view_account` | `AccountViewTracker` |
| `video_*` | `PdpEpisodePreviewModal` |
| `select_cadeaubon_bedrag` | `GiftCardPurchaseForm` |
| `scroll` / outbound `click` | site-wide trackers |
| `login` / `sign_up` / `logout` | `CustomerProvider` |
| `share` | PDP invite e-mail link |

## Tests

```bash
cd frontend && npm run test:run -- src/lib/analytics
```

## GTM container

Configure GA4 tags in GTM to listen for the event names above. Map `user_data` for Enhanced Conversions where applicable. Do **not** add a client-side `purchase` tag on `/bedankt` — use the server container event only.
