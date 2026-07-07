# Vrije Academie Frontend

Next.js frontend application for the Vrije Academie website.

## Overview

This Next.js application serves as the frontend for Vrije Academie, communicating with both Sanity (CMS) and Medusa (e-commerce) through abstraction layers that allow easy swapping of backend services.

## Architecture

### API Abstraction Layers

The frontend uses abstraction layers to isolate backend implementations:

- **CMS Layer** (`src/lib/cms/`): Abstracts Sanity CMS
- **Commerce Layer** (`src/lib/commerce/`): Abstracts Medusa e-commerce

Components import from these abstraction layers, never directly from Sanity or Medusa SDKs. This allows swapping backends (e.g., Sanity → Contentful, Medusa → Shopify) without rewriting components.

### Locale formatting (dates, times, EUR)

Use **`src/lib/locale-format.ts`** for Dutch (`nl-NL`) formatting instead of duplicating `Intl` options in components:

- `formatPriceEur(cents, 'whole' | 'standard')` — `standard` (default) shows cents on PLP cards, PDP booking panel, session tables, and cart/checkout; whole euro amounts use Dutch “,-” instead of “,00”; `whole` omits decimals (avoid for “Vanaf” prices — it rounds e.g. € 19,50 to € 20).
- `formatDateShort`, `formatDateWeekdayLong`, `formatTime`, `formatTimeRange` (optional `separator`: ` tot ` vs default ` – `).
- `formatDateShortOrNull` / `formatTimeOrNull` for optional ISO strings.
- `formatDateFromYmd('YYYY-MM-DD')` for agenda chips without timezone shift.

### JSON-LD (Schema.org)

Use **`src/lib/json-ld.ts`** for structured data:

- `getSiteOrigin()` — from `NEXT_PUBLIC_SITE_URL` or `https://vrijeacademie.nl`.
- `absolutizeUrl(path)` — absolute URLs for `item` / `url` fields.
- `stringifyJsonLd(data)` — `JSON.stringify` safe inside `<script>` (escapes `<`).
- `buildBreadcrumbListJsonLd`, `buildBreadcrumbListFromCrumbs` — `BreadcrumbList`.
- `buildItemListJsonLd` — PLP first-page `ItemList`.
- `buildPdpEventOrCourseJsonLd(handle, event)` — PDP `Course` / `Event`.

Render with **`<JsonLd data={…} />`** from `src/components/common/JsonLd.tsx` instead of hand-written script tags.

### Component Structure

```
src/components/
├── ui/          # Reusable UI components (Button, Badge, Card)
├── blocks/      # Sanity block components (Hero, RichText, etc.)
├── layout/      # Layout components (Header, Footer)
├── account/     # Mijn account shell, dashboard, wishlist, password modal, orders
└── pdp/         # Product detail: booking, session table, location tabs
```

**PDP sessions**: `GET /store/events/:handle` omits variants whose `event_item.start_at` is in the past; the commerce client applies the same filter as a safeguard. `PdpLocationTabs` splits **online** sessions (one bordered block with shared background: heading, datum, tijd, prijs, CTA, and Zoom/replay info) from **Fysieke sessies** (offline only). When an event has physical sessions in more than one city, an **Alle locaties** tab is shown first (default selected); per-city tabs filter the list. With multiple physical sessions, users can sort by datum or locatie via a dropdown or clickable column headers. On mobile (`< md`), each physical session is a vertical stack; from `md` up the session tables are used. Session **Beschikbaarheid**: uitverkocht → “Volgeboekt”; ≤ `lowStockThreshold` (default 5) → “Nog N plaats(en)”; **10+ vrije plaatsen** → “Beschikbaar”; otherwise → “N beschikbaar”. Logic in `sessionTableAvailabilityPresentation`. **Reizen with external registration**: when Medusa returns `external_registration_url` (Salesforce `External_Registration_URL__c`), **Direct inschrijven** in `PdpBookingPanel` and session rows opens that URL in a new tab instead of the cart. **VAthuis** products (`purchase_mode: bundle_only`) show `PdpEpisodesTable` with a chapter selector, episode rows (aflevering, duur, beschrijving), **Bekijk aflevering** preview modal (`PdpEpisodePreviewModal` + Audience Player iframe), and **Koop alle lessen** on locked rows (scrolls to `#booking-panel`). Copy for sessions, online info, and episodes is editable in **General settings → PDP → UI labels** (`physicalSessionsHeading`, `onlineSessionsHeading`, `onlineSessionsZoomInfo`, `onlineSessionsReplayInfo`, `sessionsSortDate`, `sessionsSortLocation`, `episodesHeading`, `chapterLabel`, column headers, `watchEpisode`, `bundleCta`). Session table column **Docent** (not “Instructeur”). Category badges in `PdpHeader` link to `/ons-aanbod/{category-slug}` when a slug is present.

**PDP / PLP prices**: Medusa variant prices are stored in major EUR units; store API responses and Sanity `priceFrom` use **cents**. `formatPriceEur(cents, …)` expects cents. The commerce client converts Medusa **cart/order** money from major EUR to cents in `src/lib/commerce/normalize-store-money.ts` (gift card purchase lines already use cent-scale `unit_price`). Re-run **Push to Sanity** (or `sync-sanity.ts --entity=products`) after price fixes so mirrored `priceFrom` updates in Studio.

**Listing routes**: `/ons-aanbod` (product tiles) and `/agenda` (one row per scheduled occurrence, with calendar day-picker) share the same tab bar, search, and filter sidebar. Default catalog sort on **Ons aanbod** and **VA Thuis ons aanbod** is **Aanbevolen** (`sort=order`), matching Salesforce `Order__c` on the product group; users can still choose start date, price, etc. See `docs/components.md` → **Listing routes: Ons aanbod & Agenda**.

**Site search (header)**: The header opens a **full-window QuickSearch overlay** (`QuickSearch` in `src/components/search/`). While typing (≥2 chars), it fetches grouped suggestions from `GET /api/search/suggest` (OpenSearch via Medusa). Category suggestions show the editorial **`image`** from the mirrored Sanity `category` doc when indexed. Submit or Enter navigates to `/zoeken?q=…`. The results page groups hits by type (Producten, Categorieën, Plaatsen, Pagina's, Docenten, Team). Category hits link to `/ons-aanbod/{slug}` (unless **`linkUrl`** is set on the category). Place/city links open `/ons-aanbod/plaats/{slug}`. The same QuickSearch is reused on `/ons-aanbod` (submit filters the PLP via `?q=`).

**Category pages**: `/ons-aanbod/{slug}` — filtered PLP with title “Ons aanbod in {label}`. Uses mirrored Sanity `category` documents (synced from Medusa product categories). The same URL segment also serves product detail pages when the slug is not a known category (category wins on collision). Legacy `/ons-aanbod?category={slug}` redirects to the path URL when that is the only filter.

**City pages**: `/ons-aanbod/plaats/{city}` — filtered PLP with title “Ons aanbod in {city}”. City slugs are resolved from Medusa event facets (same source as Ons aanbod filters); Sanity `city` mirrors are used when present for the label.

**PDP shape**: Buttons, badges, cards, gallery tiles, and related/similar product tiles on the product detail route use **square corners** (`rounded-none`); see **Design principles** in `docs/DESIGN_SYSTEM.md`.

## Setup

### Prerequisites

- Node.js 18+
- Sanity project ID
- Medusa backend URL

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=           # Required for visual editing & draft mode (create at sanity.io/manage)
NEXT_PUBLIC_SANITY_STUDIO_URL=http://localhost:3333
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000   # required — commerce code throws if unset
NEXT_PUBLIC_MEDUSA_API_KEY=your-api-key
```

### Medusa customer auth

The commerce client uses **JWT auth** (`localStorage` key `medusa_auth_token`), not cookie sessions. The storefront (`http://localhost:3000`) and Medusa (`http://localhost:9000`) are different origins, so session cookies from Medusa are not reliably sent on API calls and protected routes such as `/store/customers/me` would return 401. JWT is sent as `Authorization: Bearer …` on each request instead.

The Medusa app must allow the storefront origin in **`STORE_CORS`** and **`AUTH_CORS`** (see `medusa/medusa-config.ts` and `medusa/.env`). Opening `/store/customers/me` directly in the browser on port 9000 will still be unauthenticated, because the token lives in the storefront origin’s `localStorage`.

If an **auth identity** exists without a linked **customer** row (empty `customer_id` in Medusa’s JWT), `/store/customers/me` returns **401** even with a token. The commerce client handles login by **refreshing the JWT** and, when needed, **creating the customer** via `POST /store/customers` then refreshing again so the token includes `actor_id`.

**Login page (`/login`) layout**: The page uses a split-screen design. The left panel (55% width, hidden on mobile) shows an editorial background image with a typographic quote overlay. The right panel holds the form. Both the image and the quote text are CMS-controlled via **Sanity → General settings → Account → Login pagina**: `loginImage` (background photo, portrait orientation recommended) and `loginQuote` (default: "Kennis verandert je blik op de wereld."). When no image is configured, the left panel falls back to a solid dark background. On mobile, a compact quote strip appears above the form.

### Account area (`/mijn-account`)

Authenticated via `useCustomer()` (same Medusa JWT session as the header). Guests see a login link with `returnTo=/mijn-account`.

**Layout**: `src/app/(main)/mijn-account/layout.tsx` wraps routes in `MijnAccountShell` (`src/components/account/MijnAccountShell.tsx`): loading state, login prompt when logged out, otherwise a **left sidebar nav** (horizontal scroll on small screens) and main content, with **logout** at the bottom of the sidebar (redirects to `/login`).

**Routes**

| Path | Purpose |
|------|---------|
| `/mijn-account` | Dashboard: welcome banner, grid of gray panels (profile + address with **Gegevens aanpassen** / **Wachtwoord wijzigen**), **Recent bewaard** and **Recent aangekocht**, full-width **Snel naar** buttons |
| `/mijn-account/gegevens` | Edit profile: `updateCustomerProfile` plus **shipping address** via `upsertCheckoutShippingAddress` (same shape as checkout). Address UI uses **`NlAddressFields`** (country field first), **`usePdokAddressLookup`** (PDOK NL only), **`useCountryToggleManualAddress`** (non-NL shows manual straat/plaats; switching back to NL re-enables PDOK), and **`validateAccountField`** with country-aware postal rules (`lib/address/postal-code.ts`). Button opens **`ChangePasswordModal`**; `?wachtwoord=1` auto-opens the modal. |
| `/mijn-account/bewaard` | Wishlist (`WishlistList`, `metadata.va_wishlist`) |
| `/mijn-account/aankopen` | Order list (`commerceClient.listCustomerOrders`) |
| `/mijn-account/collectie` | Placeholder for future “online” content |

**Commerce**: `listCustomerOrders` wraps `medusa.store.order.list`. Password management uses `commerceClient.setPassword` → `POST /store/auth/set-password` (current password, or OTP verification when the account has no password). `getAuthStatus` drives “Wachtwoord instellen” vs “Wachtwoord wijzigen” in account gegevens. Checkout/login OTP: `customerLookup`, `requestOtp`, `verifyOtp`, `registerPasswordless` — see `medusa/docs/CUSTOMER_AUTH.md`.

Storefront copy for the account area lives in `src/locales/nl.json` (`accountPage`).

### Wishlist

Saved courses are stored as **product handles** (same handles as PLP/PDP URLs under `/ons-aanbod/[handle]`).

- **Guests**: `localStorage` key `va-wishlist` (via `useWishlist` / `getWishlistHandlesLocal`).
- **Logged-in customers**: Medusa **customer** row **`metadata.va_wishlist`** (JSON array). On login, local and account lists are merged and synced with `commerceClient.syncWishlistHandles`.

The commerce client also exposes `getWishlistHandles`, `addWishlistHandle`, and `removeWishlistHandle`; toggles in the UI use full-list sync so guest and account state stay aligned.

- **PLP / PDP**: `PlpEventCardWishlistButton` and `PdpBookingPanel` toggle membership without requiring login.
- **Account** (`/mijn-account/bewaard`, login required): `WishlistList` loads titles/thumbnails via `commerceClient.getEvent(handle)` per saved handle.

Labels: **Sanity → General settings → PDP → UI labels** (`wishlist`, `wishlistSaved`, `inviteSomeone`); the header share control still uses `share`. Defaults and account copy live in `src/locales/nl.json` (`pdp`, `accountPage`).

Below the wishlist control, the panel adds **Nodig iemand uit** (`mailto:` with a prefilled subject/body) and **Deel** (copy: `pdp.bookingShare`) with Facebook, e-mail, and LinkedIn actions (canonical product URL from `NEXT_PUBLIC_SITE_URL` / `plpProductPath`).

### Development

```bash
npm run dev
```

Application will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

### Tests

```bash
npm run test        # Watch mode
npm run test:run    # Single run
npm run test:coverage
```

## Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for complete design token reference and component usage.

### Key Design Tokens

- **Colors**: VA palette with Tailwind shades `50–950` + `DEFAULT`; source `src/lib/va-colors.js` (see DESIGN_SYSTEM.md)
- **Typography**: `next/font` — Source Sans 3 (`font-sans`) site-wide; `font-mono` uses Tailwind’s default system stack if needed
- **Spacing**: Tailwind default scale with custom margins
- **Components**: Modular, reusable components following VA design principles

## Visual Editing

The frontend supports Sanity's visual editing through the Presentation tool:

1. Create a **viewer token** at [sanity.io/manage](https://www.sanity.io/manage) → project → API → Tokens
2. Add `SANITY_API_READ_TOKEN` to `.env`
3. Content creators edit in Sanity Studio; changes appear in real-time preview with click-to-edit

If `SANITY_API_READ_TOKEN` is missing, `/api/draft` returns 503 with a helpful error.

**Staging / production**: Add the frontend origin (e.g. `https://v2.vrijeacademie.nl`) to the Sanity project **CORS origins** with **Allow credentials**. Set `NEXT_PUBLIC_SANITY_STUDIO_URL` to the deployed Studio URL (`https://<project-id>.sanity.studio/studio`). Without CORS or the viewer token on the server, Presentation may show click-to-edit overlays on published content while draft edits do not refresh.

**Live updates**: `SanityLive` uses the same viewer token in the browser during draft mode and `revalidateSyncTags` → `router.refresh()` (required on Next.js 16). In Draft Mode, string fields are stega-encoded for overlays, which breaks strict equality (`=== 'h3'`, `=== 'bibliotheek'`). Block components use `getTitleTag()`, `getTitleSizeClass()`, and `cleanBlockValue()` from `@/lib/cms` (`stegaClean`) for heading size/alignment and for **library vs custom** item `source` on the Categories block so labels, images, and links resolve correctly.

## 404

- `app/not-found.tsx` wraps the shared [`NotFoundView`](../src/components/NotFoundView.tsx) with header/footer for routes outside `(main)`.
- `app/(main)/not-found.tsx` renders the same content inside the main layout (e.g. missing CMS slug).
- The secondary CTA links to `/vragen`; adjust the `href` in `NotFoundView` if that page uses another slug.
- CTAs use [`Button`](../src/components/ui/Button.tsx): `variant="primary"` (homepage) and `variant="outline"` (vragen), matching [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (serif title, sans body, `rounded-sm`).

## SEO & JSON-LD

- Metadata from Sanity page documents
- JSON-LD structured data for Organization, Event, BreadcrumbList
- Next.js App Router metadata API
- **No-index (pre-launch)** — all routes inherit `SITE_ROBOTS` from `app/layout.tsx` (`noindex, nofollow` via `src/lib/cms/seo-metadata.ts`); CMS SEO fields do not override this until launch

## i18n Readiness

The application is structured for future multi-language support:

- Locale-aware routing ready
- Translation file structure prepared
- No hardcoded strings in components

## API Usage

### CMS (Content)

```typescript
import { cmsClient } from '@/lib/cms'

// Get page
const page = await cmsClient.getPage('about')

// Get settings
const settings = await cmsClient.getGeneralSettings()
```

### Commerce (Events/Products)

```typescript
import { commerceClient } from '@/lib/commerce'

// Get events
const events = await commerceClient.getEvents({
  category: 'Collegereeksen',
  eventType: 'online',
  limit: 10,
})

// Get single event
const event = await commerceClient.getEvent('event-handle')
```

## Deferred Work (TODO placeholders)

The following dynamic backends are stubbed with explicit TODOs; search for `TODO(HUBSPOT)` and `TODO(EVENTS_DYNAMIC)`:

- **HUBSPOT**: Form block HubSpot embed; Form submit handler HubSpot submission mapping; Hero newsletter form
- **EVENTS_DYNAMIC**: Persons block dynamic data source; Columns block productCards dynamic product source (Medusa)

See [components.md](./components.md#deferred-work) for details.

## Documentation

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Design tokens and component usage
- [components.md](./components.md) - Block components and CMS integration
- [OPEN_POINTS.md](./OPEN_POINTS.md) - Future considerations
