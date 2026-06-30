# VA Thuis storefront

On-demand lecture section with a dark theme, separate from Ons aanbod and Agenda.

## Routes

| Path | Purpose |
|------|---------|
| `/va-thuis` | CMS landing (`page` slug `va-thuis`, `isVaThuis`) |
| `/va-thuis/…` | CMS sub-pages (`isVaThuis`, slug `va-thuis/…`) or bundle PDP when single segment |
| `/va-thuis/ons-aanbod` | Filterable catalog (category + docent, search, sort) |

VA Thuis products on `/ons-aanbod/[handle]` **301 redirect** to `/va-thuis/[handle]`.

Route constants: `frontend/src/lib/routes.ts` (`VATHUIS_BASE_PATH`, `VATHUIS_CATALOG_PATH`, `vathuisProductPath`, `productDetailPath`).

## Data

- **Listing:** Medusa `GET /store/vathuis` via `commerceClient.getVathuisPaginated()`
- **PDP:** shared `GET /store/events/:handle` (404 on VA Thuis route if not `bundle_only`)
- **Similar:** `GET /store/vathuis/:handle/similar` via `commerceClient.getSimilarVathuis()`
- **CSR pagination:** `GET /api/plp/vathuis`

Products are excluded from Ons aanbod, Agenda, and site search (`record_type: vathuis`).

## Components

All under `frontend/src/components/vathuis/`:

- `VaThuisSubNav` — section sub-navigation (landing / catalog)
- `VaThuisEventCard` — dark card with play overlay + episode meta
- `VaThuisListingPage` / `VaThuisLiveListing` — catalog shell
- `VaThuisPdpPageContent` — dark PDP (episodes table, booking panel)
- `VaThuisCmsPage` — renders CMS `page.blocks` via `BlockRenderer` (`tone="onDark"`)

Dark shell: `app/(main)/va-thuis/layout.tsx` (`bg-va-black`).

## CMS

VA Thuis content is a normal **`page`** document with **VA Thuis page** enabled. Slug must start with `va-thuis`. Query: `cmsClient.getPage(slug)` (`PAGE_QUERY` in `page-query.ts`).

Landing Page id: `pageVaThuis` (slug `va-thuis`). Dedicated blocks: `vathuisHeroBlock`, `vathuisCategoriesBlock`, `vathuisProductRowBlock`, `vathuisTeachersBlock`, `vathuisPromoTilesBlock`.

`vathuisCategoriesBlock`: optional curated category refs (default migration seeds 4 tiles: kunstgeschiedenis, architectuur, filosofie, geschiedenis). Without items, falls back to categories with VA Thuis products, then top categories by sort order.

Migration from legacy `vathuisBlock`: `cd sanity && npm run migrate:vathuis-landing-to-blocks`

Sanity constants: `sanity/src/constants/storefront-paths.ts` (`VATHUIS_CMS_PAGE_ID`).

## Follow-ups (out of scope v1)

- Include VA Thuis in `/zoeken` site search
- Dedicated Sanity PLP block for catalog intro (catalog uses defaults today)
