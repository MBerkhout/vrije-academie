# Medusa → Sanity Sync

Medusa is the source of truth for Products, Categories, Cities (plaatsen), and Docenten. Sanity receives mirrored read-only copies via event subscribers and a resync CLI.

## Deterministic document IDs

| Entity | Sanity `_id` | Sanity `_type` |
|--------|--------------|----------------|
| Product (event group) | `medusa-product-<id>` | `product` |
| Category (native product category) | `medusa-category-<id>` | `category` |
| City (plaats) | `medusa-city-<id>` | `city` |
| Docent | `medusa-docent-<id>` | `docent` |

## Subscribers (`src/subscribers/`)

| File | Events | Action |
|------|--------|--------|
| `sync-product-to-sanity.ts` | `product.updated`, `product.deleted` | Upsert / delete Sanity `product` mirror (`product.created` runs via Salesforce push workflow, which calls Sanity after SF) |
| `sync-product-category-to-sanity.ts` | `product-category.created`, `…updated`, `…deleted` | Upsert / delete Sanity `category` mirror (native Medusa categories at `/app/categories/:id`) |
| `sync-category-to-sanity.ts` | `catalog.category.created`, `…updated`, `…deleted` | Upsert / delete Sanity `category` mirror (legacy custom `catalog_category` module) |
| `sync-city-to-sanity.ts` | `catalog.city.created`, `…updated`, `…deleted` | Upsert / delete Sanity `city` mirror |
| `sync-docent-to-sanity.ts` | `people.docent.created`, `…updated`, `…deleted` | Upsert / delete Sanity `docent` mirror |

Subscribers are no-ops when `SANITY_PROJECT_ID` or `SANITY_WRITE_TOKEN` is unset (safe in dev without Sanity configured).

## Resync CLI

Full or partial resync (e.g. after a bulk import):

```bash
# Full resync
npx medusa exec ./src/scripts/sync-sanity.ts

# Entity-specific
npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=categories
npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=catalog-categories
npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=cities
npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=docenten
npx medusa exec ./src/scripts/sync-sanity.ts -- --entity=products
```

Single product (after Salesforce HTML import fixes):

```bash
npx medusa exec ./src/scripts/sync-one-product-sanity.ts -- prod_01...
```

## Salesforce HTML → PDP body

`html-to-pdp-body.ts` converts Salesforce `Productgroup_Description__c` / web body HTML into Sanity `textBlock` portable text. Inline tags supported: `<strong>`, `<em>`, `<a href="…">` (Sanity link marks), `<span>` (stripped, text kept), `<br>`. Re-sync affected products after parser changes when `pageBodyOwnedBySanity` is false.


```env
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_WRITE_TOKEN=your_write_token  # Needs write access to all document types
MEDUSA_ADMIN_URL=http://localhost:9000  # Used in Sanity Studio "Open in Medusa" links
# Optional: root URL of Sanity Studio including basePath (e.g. http://localhost:3333/studio). Defaults to https://<SANITY_PROJECT_ID>.sanity.studio/studio
SANITY_STUDIO_URL=http://localhost:3333/studio
```

## Medusa Admin

On the product detail **Product Group** widget, **Open in Sanity** opens the mirrored `product` document in Structure (next to **Push to Sanity**). The URL comes from `GET /admin/sanity/products/:id` (`openInSanityUrl`), with a **fallback** baked into the admin bundle via `medusa-config.ts` (`admin.vite.define` using the same `SANITY_STUDIO_URL` / `SANITY_PROJECT_ID` rules as the API). Restart `medusa develop` after changing those env vars so the admin picks up the new injected URL. Link shape matches Studio’s Structure tool: `{SANITY_STUDIO_URL}/studio/structure/product;medusa-product-<id>` (with `SANITY_STUDIO_URL` including the Studio `basePath`, e.g. `http://localhost:3333/studio`).

On the native category detail page (`/app/categories/:id`), the **Sanity** side widget shows last sync time, **Open in Sanity**, and **Sync to Sanity** via `GET` / `POST` `/admin/sanity/categories/:id`. Studio deep link: `{SANITY_STUDIO_URL}/studio/structure/category;medusa-category-<id>`.

## Mirrored product fields

| Sanity field | Source | Editable in Studio? |
|---|---|---|
| `medusaId` | `Product.id` | No |
| `handle` | `Product.handle` | No |
| `title` | `Product.title` | No |
| `recordType` | `EventGroup.record_type` | No |
| `thumbnailUrl` | `Product.thumbnail` | No |
| `imageUrls` | `Product.images[].url` | No |
| `description` | `Product.description` | No |
| `tags` | `Product.tags[].value` | No |
| `categories` | category links | No |
| `docenten` | docent links | No |
| `hasFreeTrial` | any `EventItem.is_free_trial` | No |
| `priceFrom` | min variant price in **cents** (converted from Medusa major EUR units) | No |
| `cities` | distinct `EventItem.city` values | No |
| `startAt` | earliest `EventItem.start_at` | No |
| `seoTitle` | `Product.metadata.salesforce_seo_title` (SF import) | No |
| `seoDescription` | `Product.metadata.salesforce_seo_description` (SF import) | No |
| `externalRegistrationUrl` | `Product.metadata.salesforce_external_registration_url` (`External_Registration_URL__c`) | No |
| `badge` | computed | No |
| `body` | Seeded from `Product.description` (plain text, one `textBlock` per paragraph). SF product groups seed from metadata in order: `salesforce_web_trigger` (quote) → `salesforce_description_html` (intro + `<strong>` section titles as `textBlock.title`) → `salesforce_web_body` (bullets + bold subheadings). Imported blocks use `width: wide`. Skipped when `pageBodyOwnedBySanity` is true. | **Yes** |
| `pageBodyOwnedBySanity` | — | **Yes** — when off, each sync rebuilds `body` from the Medusa description; when on, sync leaves `body` unchanged |
| `onlineBadge` | `{ enabled, text }` | **Yes** |
| `customUrgencyMessage` | text max 80 chars | **Yes** |
| `relatedProducts` | array of product refs | **Yes** |

## Mirrored category fields (native product category)

| Sanity field | Source | Editable in Studio? |
|---|---|---|
| `medusaId` | `ProductCategory.id` | No |
| `slug` | `ProductCategory.handle` | No |
| `label` | `ProductCategory.name` | No |
| `sortOrder` | `ProductCategory.rank` (default `0`) | No |
| `imageUrl` | `ProductCategory.metadata.image_url` or `imageUrl` | No |
| `color` | `ProductCategory.metadata.color` | No |
| `image` | — | **Yes** (editorial override) |
| `linkUrl` | — | **Yes** |

Legacy `catalog_category` rows use the same Sanity `category` type and `sync-category-to-sanity.ts`; prefer native categories for new work.

## Sanity Studio behaviour

- **Products** (`product`): default document actions (**Publish**, Discard, …) plus **Open in Medusa**. Creating new products from the Studio remains blocked; use Medusa, then **Push to Sanity** or wait for the subscriber.
- **Categories / docenten**: only **Open in Medusa** (no Publish) — mirror fields + small editorial overrides are updated from Medusa on sync.
- Mirrored catalog fields on `product` stay read-only in the form; editorial fields use per-field rules as before.
