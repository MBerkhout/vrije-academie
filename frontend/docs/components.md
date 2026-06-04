# UI Components & Design Tokens

Base UI components and the Vrije Academie design system. Import from `@/components/ui`.

## Typography

| Use   | Font             | Tailwind Class  |
| ----- | ---------------- | --------------- |
| Titles | Source Sans Pro  | `font-sans`     |
| Text  | Merriweather     | `font-serif`    |

Body text inherits Merriweather from `body`. Use `font-sans` for headings (h1–h6). Tailwind preflight resets heading font sizes to inherit, so **in-block item titles** (USP items, person names, column cards, event list rows, hero newsletter heading) use `getTitleSizeClass('h3')` from `@/lib/cms` (`text-xl`) to stay aligned with the same h1–h4 scale as block section titles.

## Color Palette

| Token       | Hex      | Tailwind Class              | Purpose                        |
| ----------- | -------- | --------------------------- | ------------------------------ |
| va-yellow   | #F5C800  | `bg-va-yellow`              | Primary CTA buttons, active     |
| va-gold     | #D4AF37  | `hover:bg-va-gold`          | CTA hover state                 |
| va-purple   | #6B4FA0  | `bg-va-purple`              | Badges (on demand, virtual)    |
| va-orange   | #F08300  | `text-va-orange`            | Links, inline accents          |
| va-black    | #1A1A1A  | `text-va-black`              | Headings, logo text            |
| va-footer   | #1E1E1E  | `bg-va-footer`               | Footer background              |
| va-darkgray | #3D3D3D  | `text-va-darkgray`          | Body text                      |
| va-gray     | #888888  | `text-va-gray`               | Muted/secondary text           |
| va-lightgray| #F2F2F2  | `bg-va-lightgray`           | Page background, borders       |
| va-white    | #FFFFFF  | `bg-va-white`               | Card/container backgrounds     |

## Components

### Header (`@/components/layout/Header`)

Global nav from **Sanity → General settings**: main menu, desktop utility menu, mobile quick bar (three links), search placeholder, cart URL. Default branding uses `/public/branding/logo.svg` and `logo_text.svg` unless a **Logo (override)** image is set.

**Commerce links (hardcoded fallback)**: **Winkelwagen** (`cartUrl`, default `/winkelwagen`) and **Mijn account** (`/mijn-account`) are appended only to the **desktop top utility row** when no item already targets that path—not to the main nav or mobile drawer.

- **Desktop**: utility links row, yellow divider, main links + pill **Zoek** control (search icon + label). Opening it renders **QuickSearch** — a full-window overlay with live grouped suggestions (products with thumbnails, categories, places, pages), recent searches (localStorage), and **Vaak gezocht** links from Sanity. Submit navigates to `/zoeken?q=…`. Escape or close (X) dismisses. Active route and nav link hovers use **`va-yellow`** underline.
- **Mobile**: Zoeken / Mand / Menu actions; **QuickSearch** is full-screen. Yellow **quick bar** from `mobileQuickMenu`; hamburger opens a two-column drawer.
- **Cart count**: reads `va_cart_id` from the browser cookie and loads the cart via `commerceClient.getCart` (same as `CartView`). When the total line quantity is greater than zero, the desktop utility link and mobile cart control show **Winkelwagen** with a yellow **`CartCountBadge`** (item count). Dispatch `window.dispatchEvent(new Event('va:cart-updated'))` after add/remove so the count refreshes without a full reload.

### Button

Variants: `primary` | `secondary` | `outline` | `ghost`  
Sizes: `sm` | `md` | `lg`

```tsx
<Button variant="primary" size="md">BOEK NU</Button>
<Button variant="outline" type="submit">Verzenden</Button>
<Button href="/events">As link</Button>
<Button disabled>Disabled</Button>
```

**Rich text**: Inline **inlineButton** marks in `PortableText` (Text block, form intros, etc.) use the same `Button` with **`size="md"`** and **`mx-1`** in running text, so **primary** and **secondary** match stand-alone CTAs; **text link** maps to `ghost`.

### Badge

Variants: `purple` | `yellow` | `gray`

```tsx
<Badge variant="purple">Virtual – ON DEMAND</Badge>
<Badge variant="yellow">Nieuw</Badge>
<Badge variant="gray">Archief</Badge>
```

### Card

```tsx
<Card title="Titel" description="Omschrijving" link="/path" linkText="Bekijk meer" />
<Card title="Titel" as="article" />
```

### Input

```tsx
<Input label="Email" type="email" placeholder="naam@voorbeeld.nl" />
<Input label="Veld" error="Verplicht veld" />
<Input disabled placeholder="Uitgeschakeld" />
```

### Textarea

```tsx
<Textarea label="Bericht" rows={5} placeholder="Typ je bericht..." />
<Textarea label="Veld" error="Verplicht" />
```

### Spinner

```tsx
<Spinner size="md" />
<Spinner size="sm" className="text-va-purple" />
```

## Utility: cn()

Merge class names with Tailwind conflict resolution. Use for conditional classes and overrides.

```tsx
import { cn } from '@/lib/utils'

<div className={cn('base', variant && 'variant-class', className)} />
```

## Content Blocks

Block components in `@/components/blocks` map to Sanity block types. The main page (`/`) and `[slug]` pages fetch blocks from CMS and render via `BlockRenderer`. Active block types: Text, Afbeelding, Accordion (FAQ), Form, Tabs, Whitespace, Hero, Uitgelichte reis, Categories, USP, Review, Demand nearby, Persons, Columns, EventList, Editorials (cards). Tabs use the same blocks as the page (minus Hero, Tabs) per tab for consistency. **Tabs** block: **Mode** is **Tabs** (panels) or **In-page navigation**. In-page: **Page or URL** / **Section ID** (Sanity docs). **Content beside navigation** is available in the studio when the in-page menu is **Left**. **Tab labels** (top / left) applies to both modes. All blocks use shared `BlockWrapper` with layout controls (margin, padding, width, background). Deprecated blocks (`Inspiration highlight`, `3 columns highlight`) map to Columns presets—see Sanity docs.

**Development only** (`NODE_ENV === 'development'`): each `BlockWrapper` root `div` gets `data-cms-block-id` (Sanity block `_id`) and `data-cms-block-type` (e.g. `heroBlock`) so tools and agents can target a specific row in the DOM without affecting production markup.

**Hero block**: Multi-slide slider shows **yellow chevron** previous/next controls at the **bottom left and right**, with **dot** indicators centered along the bottom. Arrows sit above slide links so they change slides without navigating. Autoplay follows Sanity **Autoplay** / **Autoplay Interval**.

**Review block**: With **overall rating** enabled, from **`md`** the score and label sit in a **left column** beside the carousel inside their own **card** (white background, light border, **yellow bottom bar**, square corners); below `md` that card stacks above the quotes. Each quote sits in a **card** (warm `va-yellow-50`, light border, **yellow bottom bar**, square corners, shadow, large decorative opening quote). **Previous/next** use **larger** controls (**`<`** / **`>`**) at the sides of the quote card; **dots** (when enabled) stay **below** the card. Navigation follows Sanity **Navigation Style** (arrows, dots, or both). If that value is missing or invalid on older documents, the UI falls back to **arrows**.

**Accordion (FAQ)**: The **first** question is **expanded by default** on initial page load; users can collapse or open others as usual (including when **allow multiple open** is enabled in Sanity).

**USP block**: Each item is either a **library USP** reference or an **Aangepast** title/description/link. Each column is **max-width 240px**; the **per-item** title uses **`text-2xl`** (block section title still follows Sanity **title size**). The yellow **divider** between title and description uses **`mt-0`** / **`mb-3` (12px)**. The description **`PortableText`** wrapper uses **`[&_p:last-child]:!mb-0`** so the last body paragraph’s default **`mb-4`** does not add extra gap before a link. **No icons** are rendered.

**Categories block**: From **`lg`**, **title**, **intro**, and **CTA** (when enabled) sit in a fixed-width **left column**; the **title** is followed by a **`4px`** **`va-yellow`** bar (**`max-width: 100px`**, all breakpoints). The category grid is **beside** the column (`flex-1 min-w-0`). The CTA is **not** full-bleed below the block on desktop; it renders as an **underlined** text-style control (`Button` `ghost`, **uppercase**); default underline matches text (**`va-black`**), **`va-yellow`** underline **on hover**; the Sanity **CTA label** is shown followed by a **` >`** (default *Bekijk ons volledige aanbod* for new documents). Below `lg`, sidebar content stacks **above** the grid. Tiles are horizontal cards (category title with **“Bekijk”** chevron **below** it, **yellow** divider, **75px**-wide image strip, **`min-height: 90px`**), square corners, grid `gap-2` / `md:gap-3`, hover shadow and image zoom, focus ring.

**Uitgelichte reis (magazine)** — `featuredTripBlock`: Full-width hero with title, ondertitel, **`PortableText` body** (on-dark), optional **CTA** when **Knop tonen** is set ( **`Button` primary `md`**, `ctaLabel` + `ctaUrl`), plus optional **infokaart**; see Sanity **block layout** doc.

**Demand nearby**: Section background is **#f3f3f3** with a faint map image (**`src/assets/city-map.jpg`**) and a light tint layer; a centered **rounded yellow** card holds the title, optional intro, and a **joined** white input + **charcoal** submit row. The city field uses **`CitySuggestField`** (`src/components/search/CitySuggestField.tsx`): live plaats suggestions from `GET /api/search/places` (Medusa event city facets — same source as Ons aanbod filters), keyboard navigation, and navigation to **`/ons-aanbod/plaats/{slug}`** on select or submit. Copy (placeholder, button label) is in `src/content/form-strings.json` under `demandNearby`.

### Deferred Work

Search codebase for `TODO(HUBSPOT)` and `TODO(EVENTS_DYNAMIC)`:

| Tag | Location | Description |
|-----|----------|-------------|
| TODO(HUBSPOT) | FormBlock | HubSpot form embed by ID |
| TODO(HUBSPOT) | api/form-submit | HubSpot submission mapping |
| TODO(HUBSPOT) | HeroBlock | Newsletter form submit handler |
| TODO(EVENTS_DYNAMIC) | PersonsBlock | Dynamic persons by filters (dataSource=dynamic) |
| TODO(EVENTS_DYNAMIC) | ColumnsBlock | productCards dynamic source (Medusa removed; manual items only) |

## Testing

Tests use Vitest and React Testing Library. Run `npm run test` or `npm run test:run`. Block renderer routing, block layout helpers, and block components have unit tests. Sanity schema helpers (e.g. `mediaEnums`) are tested in the `sanity` package with `npm run test:run`.

## Layout & Routes

- **Header/Footer**: Shown on all pages except `/afrekenen`. Defined in `app/(main)/layout.tsx`, fetched from Sanity `GeneralSettings`.

### Footer (`@/components/layout/Footer`)

- **Background**: `bg-va-footer` (`#1E1E1E`).
- **Logo**: `/public/branding/footer-logo.svg` (links to home).
- **Top band**: Contact + socials on the left. Primary **menu** has a **short vertical yellow accent** (`w-0.5`) only alongside the link stack (not full height of the signup panel). **`lg`+**: optional **Blijf op de hoogte** shares the row with **`justify-between`**; menu and form use **`items-center`** so the accent stays link-height. Form-only uses **`border-l-2`** on the yellow panel. The form block is hidden below `lg`.
- **Bottom band**: Sanity **footer columns** (any **Nieuwsbrief** column is ignored). The **juridisch / praktisch** menu is injected in the bottom grid (same slot as a removed Nieuwsbrief column when that existed); heading from **Footer bottom — legal column heading** (default “Juridisch”).
- **Copyright**: Custom string with optional `{year}`, or a default notice with the current year.
- **Route groups**: `(main)` = with Header/Footer; `(checkout)` = `/afrekenen` only, no Header/Footer.
- **Visual Editing**: Draft mode at `/api/draft`. `SanityLive` and `VisualEditing` in root layout. CMS client uses `sanityFetch` for draft-aware, stega-encoded fetches (click-to-edit, live updates). Requires `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_SANITY_STUDIO_URL`. Blocks that branch on string fields (e.g. Categories/USP `source` = bibliotheek vs aangepast) must use `cleanBlockValue()` from `@/lib/cms` before `===` comparisons, or tiles render empty in draft/preview.

## Listing routes: Ons aanbod & Agenda

Two tabbed listing routes share the same filter model and components under `@/components/plp`:

- **Product listing (PLP)** — path is `PLP_BASE_PATH` in `src/lib/routes.ts` (default `/ons-aanbod`; must match the `app/(main)/ons-aanbod` route segment). One tile per **product** (course/lecture); `PlpEventCard` grid (**2** columns from the smallest breakpoint, **3** from `lg`; **`gap-2`** below `md`, then **`gap-4`** / **`gap-6`** at larger breakpoints). On mobile, card titles use **`text-sm`** with up to **3** lines; CTA reads **Bekijk →** (desktop: **Bekijk meer →**). Sort options include relevance, newest, price, and earliest start date. **Record-type badge** (top-left on the image): for **Reis**, **Studiedag**, **Wandeling**, and **Workshop** (Salesforce → Medusa `product.type`), each type has its own badge color (purple / yellow / orange / black). Badges link to a filtered PLP (`/ons-aanbod/wandeling` when that is the only filter, otherwise `?product_type=…` with other filters preserved). Filter sidebar group **Soort activiteit** uses `product_type[]` on `GET /store/events`. Dedicated landing pages: `/ons-aanbod/reis`, `/ons-aanbod/studiedag`, `/ons-aanbod/wandeling`, `/ons-aanbod/workshop` (title “Ons aanbod in {type}”; category slug wins on collision). Other types may still show a free-text **status badge** from Sanity (`badge`) when set. State + serializer in `app/(main)/ons-aanbod/_state/url.ts`. Data from `commerceClient.getEventsPaginated()` → `GET /store/events`. **On-site-only** products drop off the listing when all offline sessions are in the past; online / pre_recorded products stay listed. City, day-part, and period filters/facets count **future offline sessions only**. **Agenda** (`/agenda`, `GET /store/agenda`) uses the same product-level visibility rules. Products can be hidden from both listings in Medusa Admin (Product → Product Group widget: **Show on Ons aanbod**); the digitale cadeaubon handle is always excluded server-side.
- **Category PLP** — `/ons-aanbod/{slug}` (title “Ons aanbod in {label}”), same shared `PlpListingPage` as the base PLP and city pages. `/ons-aanbod/[handle]` resolves **category first**, then **product type** (reis / studiedag / wandeling / workshop), otherwise product PDP. Legacy `?category=` alone redirects to the path URL. Selecting a **second category** (or opening a multi-category query on a category path) navigates to `/ons-aanbod?category=…&category=…` so filter checkboxes stay in sync.
- **City PLP** — `/ons-aanbod/plaats/{city}` (title “Ons aanbod in {city}”). City slug is validated via Medusa event facets (Sanity `city` mirror used for label when synced).
- **`/agenda`** — one row per **scheduled occurrence** (event_item). Renders `AgendaRow` (date block · title + location · time range · action button). Additional `date` single-day filter rendered as a `AgendaDayPicker` (month calendar) above the shared sidebar. Future occurrences only. State + serializer in `app/(main)/agenda/_state/url.ts`. Data from `commerceClient.getAgendaPaginated()` → `GET /store/agenda`.

Filter state and commerce types use **`teachers`** for selected slugs and facet buckets; URLs and Medusa query params stay **`docent` / `docent[]`** for backward-compatible links. The Medusa client maps API `docenten` in JSON to `teachers` when building typed results.

**Shared components** (`@/components/plp/*`) accept `basePath` so they pick the correct URL serializer client-side (`src/lib/filter-url-helpers.ts`: Ons aanbod vs `/agenda`, including the extra `date` field). Reused from both routes: `PlpTabs`, `PlpQuickSearchTrigger`, `PlpFilterSidebar`, `PlpActiveChips` (supports `extraChips` for non-PLP fields like `date`), `PlpSortSelect` (accepts custom `options`), `PlpInfiniteResults` / `AgendaInfiniteResults` (infinite scroll + “Laad meer activiteiten” append), `PlpEmptyState`, `PlpHeader`, `PlpBreadcrumbs`, `PlpBanner`.

**Infinite listing**: The first page loads server-side; additional pages fetch via `GET /api/plp/events` or `GET /api/agenda/items` and append below the grid/list. Scrolling near the bottom auto-loads the next batch; the load-more button triggers the same fetch. Legacy `?page=2` URLs redirect to page 1 without the `page` param.

**QuickSearch** (`src/components/search/QuickSearch.tsx`): full-window overlay; props `open`, `onClose`, `placeholder`, `popularSearches`, `submitBasePath`, `initialQuery`. Used in `HeaderNav` and via `PlpQuickSearchTrigger` on listing pages.

**Categorie filter** (`PlpFilterSidebar`): shows **6** options with a bottom fade; **Meer tonen** (down chevron) sits in that fade overlay—no separate bordered row. Click expands the full list. If a selected category is beyond the first six, the list starts expanded so the active filter stays visible.

**Plaats filter** (`PlpFilterSidebar`): on desktop the group is **expanded by default** (mobile drawer keeps all groups collapsed). Cities are ordered by **most events** (facet count, descending; alphabetical tie-break). Without a search query, the checklist shows **5** options with a bottom fade; **Meer bekijken** (down chevron) sits in that fade overlay—no separate bordered row. After expanding, all places are listed; if there are **more than 10**, the list scrolls inside a max-height region (~10 rows). Typing in the plaats search shows matching results in the same scroll pattern when needed.

**Mobile filters** (`PlpFilterSidebar` with `mobileOnly`): trigger shows a sliders icon, stronger border, and active-count badge. Opens a **full-screen** panel (`lg` and up keep the desktop sidebar). Filter groups start **collapsed** each time the panel opens; group titles use **`text-base`** (desktop sidebar keeps **`text-sm`**). When a group has active selections, a yellow count badge appears next to its title (same style as the trigger). Header: title + underlined **Wis alle filters**; scrollable checklist area; fixed footer **Filters sluiten** (yellow, safe-area padding) so content is not covered. Body scroll is locked while open. Used on Ons aanbod and Agenda listing pages.

**Agenda row status button** is derived in the backend (`item.status`) from `available_quantity` + product tags:

| Status         | Button label                 | Color                 |
| -------------- | ---------------------------- | --------------------- |
| `open`         | Inschrijven                  | `bg-va-yellow`        |
| `almost_full`  | Bijna vol (≤ 3 plekken)      | `bg-red-600`          |
| `waitlist`     | Wachtlijst (uitverkocht)     | `bg-va-gray`          |
| `exclusief`    | Exclusief in {city}          | `bg-va-purple`        |

The `exclusief` status triggers when the product has a tag whose value contains `exclusief` (case-insensitive); it takes precedence over inventory-derived states.

**Shared presentation logic** lives in `src/lib/event-status-presentation.ts`: `presentationForAvailabilityStatus` (agenda CTAs), `classNameForProductBadge` (PLP image badges from free-text keywords), `plpEventLocationLabel` (PLP tile location: single city name, **Op locatie** when multiple cities, **Online** / **Op locatie + online** for delivery mixes), `isOnlineOnlyEvent`, and `shouldShowEventDates` (hide dates on online-only products and hybrid products whose on-site sessions are all past). Extend the keyword lists there so new UI stays consistent.

**Delivery type icons** (`DeliveryTypeIcon` in `@/components/ui`): online activities show a **blue camera** icon; on-site activities show a **red map pin**. Icon choice follows `shouldShowOnlineDeliveryIcon` (online delivery type, online-only product, or location label **Online**). Used on `AgendaRow` and `PlpEventCard`.

## Product detail (PDP)

**Image gallery** (`PdpImageGallery`): product images render as a compact row of thumbnails (up to four, deduped from `image_urls`), not a full-width carousel. On desktop each tile is **270×180px** (`3:2`); below `md`, tiles flex to two or four per row. Optional per-image **caption** shows a white **i** control that opens a tooltip; wire captions when available via `PdpGalleryImage.caption`.

**Sessies** (`PdpLocationTabs`): on **mobile** (`< md`), one card per session with fields stacked vertically (city, optional venue from variant title, date, time, docent, price, availability, full-width CTA). From **`md` up**, the original column table is shown. City tabs unchanged when multiple locations exist.

**Session availability** (`sessionTableAvailabilityPresentation`): **Volgeboekt** at 0; **Nog N plaats(en)** when `available_quantity ≤ lowStockThreshold` (Sanity default 5); **Beschikbaar** when **10+** spots remain; otherwise **N beschikbaar** (e.g. 6–9 spots).

**Bottom sections** (in `PdpPageContent`, below trust bar):

- **Gerelateerde activiteiten** — `PdpSimilarCourses` ← `GET /store/events/:handle/similar` (same category, future + available, popularity sort with random fallback). Shown when `similar.length >= 2`. Uses `PlpEventCard` (`squareCorners`). Heading from Sanity `pdp.labels.similarHeading` or default “Gerelateerde activiteiten”.
- **Related products (editorial)** — `PdpRelatedProducts` ← Sanity `relatedProducts` when configured.
- **Recent bekeken** — `PdpRecentViewed` (client-only): records the current handle in `localStorage` (`va-recent-viewed`, max 6) and, when logged in, `customer.metadata.va_recent_viewed`. Displays up to 4 other recently viewed products via `commerceClient.getEvent`; **not server-rendered** so PDP cache cannot leak per-user history. Section hidden when there is nothing to show (excluding the current product).

## Dev Page

Visit `/dev/components` in development to preview all components. Returns 404 in production.

## Troubleshooting: Page content not showing

If a page loads but shows no blocks (or the fallback "Geen inhoud op deze pagina"):

1. **Publish in Sanity** – Saving is not enough. Click **Publish** so the page and its blocks are published. Draft content is not shown on the frontend unless draft mode is enabled.
2. **Correct URL** – CMS pages live at `/{slug}`. For a page titled "test" with slug `test`, open `http://localhost:3000/test`. Nested slugs in Sanity (e.g. `over-ons/docenten`) map to `/over-ons/docenten` via the catch-all `(main)/[...slug]` route. The home page (`/`) loads the CMS page whose slug is `/` (set the slug field to `/` in Sanity).
3. **Slug** – Check the page’s slug in Sanity. It can differ from the title (e.g. `test-1` if `test` already exists).
4. **Referenced blocks** – Blocks are separate documents. Publishing the page typically publishes referenced blocks as well. If blocks are missing, try republishing the page.
5. **Draft mode + block references** – The GROQ query uses a coalesce pattern (`drafts.` + ref, then ref) to resolve block references in both draft and published perspectives. If you still see no content in draft mode, ensure `SANITY_API_READ_TOKEN` has Viewer role (draft read permission).
6. **Homepage / category tiles out of date on staging** – The home route (`app/(main)/page.tsx`) uses `revalidate = 60` like other CMS pages. If category images (or other Sanity content) show locally but not on a deployed frontend, redeploy so `npm run build` picks up fresh CMS data; an old fully static prerender can keep serving HTML without tile images until then.
