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
- **PDP:** shared `GET /store/events/:handle` (404 if missing or not `bundle_only`; 500 if Medusa is down)
- **Similar:** `GET /store/vathuis/:handle/similar` via `commerceClient.getSimilarVathuis()`
- **CSR pagination:** `GET /api/plp/vathuis`

Products are excluded from Ons aanbod, Agenda, and site search (`record_type: vathuis`). **Availability:** VA Thuis colleges are always purchasable (never sold out); capacity from Salesforce is not enforced.

## Components

All under `frontend/src/components/vathuis/`:

- `VaThuisSubNav` — section sub-navigation (landing / catalog)
- `VaThuisEventCard` — dark card with play overlay + episode meta
- `VaThuisListingPage` / `VaThuisLiveListing` — catalog shell
- `VaThuisPdpPageContent` — dark PDP (episodes table, booking panel). Featured docent stays in the right-hand booking panel: photo left, name + title right.
- `VaThuisCmsPage` — renders CMS `page.blocks` via `BlockRenderer` (`tone="onDark"`)

**Purchase access:** after buying a bundle, logged-in customers can watch all episodes for **3 months** (`PdpEpisodesTable` unlock + `/mijn-account/collectie`). Preview and purchased playback both use the Audience Player **embed-player SDK** (not iframes) so `play()` can run in the user’s click gesture; tokens come from Medusa — see `medusa/docs/VATHUIS_ACCESS.md`.

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
