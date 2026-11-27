# Analytics & GTM

Client-side tracking via Google Tag Manager (`dataLayer`) and server-side commerce events via **Stape server GTM** (Medusa).

## Environment

**Frontend** (`frontend/.env`):

```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GTM_ENABLED=true   # set false locally to disable pushes
NEXT_PUBLIC_SITE_URL=https://www.vrijeacademie.nl
```

**Medusa** (`medusa/.env`) — see also `medusa/.env.template`:

```bash
SGTM_ENABLED=true
SGTM_ENDPOINT_URL=https://your-container.stape.io/data
SGTM_PURCHASE_SECRET=optional-shared-secret
# SGTM_EVENT_PATH=/v1/events
# SGTM_API_KEY_HEADER=X-Api-Key
# SGTM_DEBUG=true
# SGTM_PREVIEW_HEADER=your-gtm-preview-token
```

## Architecture

- [`src/lib/analytics/`](../src/lib/analytics/) — types, mappers, `pushEvent`, `track*` helpers, **`attribution.ts`** (checkout cookies / click ids)
- [`src/components/analytics/`](../src/components/analytics/) — GTM bootstrap, providers, list context
- [`src/components/consent/`](../src/components/consent/) — cookie banner + footer “Cookie-instellingen”
- [`src/lib/analytics/consent/`](../src/lib/analytics/consent/) — `hasConsent` cookie, Consent Mode v2 `gtag` helpers
- [`medusa/src/lib/gtm/`](../../medusa/src/lib/gtm/) — Stape payloads, Data Client envelope (`event` → `event_name`), HTTP sender
- **Medusa subscribers**
  - [`gtm-purchase-order-completed.ts`](../../medusa/src/subscribers/gtm-purchase-order-completed.ts) — `order.completed` → `purchase`
  - [`gtm-refund-order-canceled.ts`](../../medusa/src/subscribers/gtm-refund-order-canceled.ts) — `order.canceled` → `refund`
  - [`gtm-sign-up-customer-created.ts`](../../medusa/src/subscribers/gtm-sign-up-customer-created.ts) — `customer.created` → `sign_up` (storefront registration only)

## Consent / cookie banner

Same behaviour as legacy **vrijeacademie.nl**: first-party banner, cookie `hasConsent=true|false` (12 months, path `/`).

1. **`GtmScripts`** — inline `beforeInteractive` script: `gtag('consent','default', … denied, wait_for_update: 500)`. If `hasConsent=true`, immediate `gtag('consent','update', … granted)` before GTM loads.
2. **`CookieBanner`** — shown when no choice yet (not on `/privacy-en-cookiebeleid`, not for bots / DNT). Accept/reject updates `gtag` + dataLayer `consent_update`.
3. **`hasAttributionConsent()`** — checkout reads `_ga` / Meta cookies only when `hasConsent=true`.

Footer **Cookie-instellingen** clears the cookie and reopens the banner.

## Stape server container

Recommended: **Stape Data Client** receiving JSON POSTs from Medusa (`event_name`, `client_id`, `event_id`, commerce fields).

In the **web** GTM container, forward browser events to the server container with the same `event_id` where both fire (`login`, `sign_up`, `add_to_cart`). Configure GA4 and Meta CAPI tags on the server container; hash `user_data` server-side.

`purchase` is sent from **both** the browser and the server. `/bedankt` (`ThankYouPageContent`) calls `trackPurchase()` once the order is `ready`, using `purchase_analytics` from `GET /store/checkout/confirmation` (built by Medusa with the same `buildGtmPurchasePayload` as the server event). Both events share `transaction_id` (`VA-{display_id}`) and `event_id` (from `cart.metadata.analytics`), so GA4 / Meta deduplicate them — configure the web and server tags to use these ids. The browser event fires once per order per session (`sessionStorage` key `va_purchase_tracked_{transaction_id}`) and clears the checkout `event_id`.

### Attribution → purchase

On checkout payment submit (`CheckoutPaymentForm`), the storefront writes `cart.metadata.analytics` (consent-aware: `_ga`, `_ga_*` session, `_fbp` / `_fbc`, `gclid`, `ttclid`, `user_agent`, stable `event_id`, `payment_type`, `page_location`). Medusa copies this to the order (with a cart fallback in `ensure-order-analytics.ts`) and includes it in the server `purchase` payload.

### Browser vs server split

| Event | Primary source |
|-------|----------------|
| `purchase` | **Browser** (`/bedankt`) + **Server** (Medusa), shared `transaction_id` + `event_id` |
| `refund` | **Server** (order canceled) |
| `sign_up` | **Browser** + **Server** (shared `event_id` on registration) |
| `add_to_cart`, `login`, `view_item`, `begin_checkout` | **Browser** (`event_id` on cart/login/sign_up for dedupe) |

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
| `consent_update` | Cookie banner accept/reject + returning visitors (`AnalyticsProvider`) |
| `search` | PLP live search, `/zoeken` |
| `view_item_list` / `select_item` | PLP, agenda, homepage carousels (`ItemListProvider`) |
| `view_item` | PDP / VA Thuis PDP (`ViewItemTracker`) |
| `add_to_cart` | `addVariantToCart()` (+ `event_id`) |
| `view_cart` / cart mutations | `CartView` |
| `begin_checkout` | `ProceedCta` |
| `add_payment_info` | `CheckoutPaymentForm` submit |
| `purchase` | `ThankYouPageContent` (`trackPurchase`) + **server** Medusa → Stape |
| `refund` | **server** Medusa → Stape (`order.canceled`) |
| `add_to_wishlist` | `useWishlist` |
| `view_promotion` / `select_promotion` | `HeroBlock` |
| `filter_change` / `sort_change` | PLP sidebar / sort |
| `checkout_step_view` | `CheckoutStepTracker` |
| `view_account` | `AccountViewTracker` |
| `video_*` | `PdpEpisodePreviewModal` |
| `select_cadeaubon_bedrag` | `GiftCardPurchaseForm` |
| `scroll` / outbound `click` | site-wide trackers |
| `login` / `sign_up` / `logout` | `CustomerProvider` (+ `event_id` on login/sign_up) |
| `view_waitlist_form` / `waitlist_signup` / `newsletter_signup` | `WaitlistModal` (sold-out CTAs on PDP, agenda, PLP) |
| `share` | PDP invite e-mail link |

## GA4 to Medusa nightly sync

Medusa reads `view_item`, `add_to_cart` and `select_item` (list, position) per `item_id` (= product handle) from the GA4 Data API every night and stores daily per-product stats for ranking. Keep `item_id` and `index` on these events stable. Details and env: [medusa/docs/README.md](../../medusa/docs/README.md#ga4-product-stats-nightly). Consent Mode means rejected-cookie users are not counted.

## Tests

```bash
cd frontend && npm run test:run -- src/lib/analytics
cd medusa && npm run test:run -- src/lib/gtm
```

## GTM container

Configure GA4 tags in GTM to listen for the event names above. Map `user_data` for Enhanced Conversions where applicable.

**Stape setup (web + server containers, Medusa `.env`, testplan):** [`docs/STAPE-GTM-BRIEFING.md`](../../docs/STAPE-GTM-BRIEFING.md).
