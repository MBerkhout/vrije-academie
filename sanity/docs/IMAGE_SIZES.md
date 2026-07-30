# Image sizes

Recommended upload dimensions for Sanity image fields. The same guidance appears in Studio field descriptions (via `defineImageField` / `defineImageWithAltField` in `src/schemas/objects/imageField.ts`). Specs live in `src/schemas/objects/imageSpecs.ts`.

Guidance only — uploads are not blocked when dimensions differ.

## Spec reference

| Spec key | Recommended size | Aspect / notes |
|----------|------------------|----------------|
| `social` | 1200×630px | Open Graph / Twitter |
| `loginPortrait` | 1200×1600px | Portrait login panel |
| `heroSlide` | 1200×675px | 16:9 hero slider (~2/3 page width; CDN default) |
| `heroTopPanel` | min. 400px wide | Free format, object-contain (~1/3 column) |
| `blockImage16x9` | 1200×675px | Default SanityImage CDN crop |
| `blockImageAspectRatio` | 1200×675 (16:9), 1200×900 (4:3), 1200×1200 (1:1) | Match aspect ratio field |
| `editorialCard` | 640×360px | 16:9 card image |
| `editorialBackground` | 1200×675px | Full-bleed section background (CDN default) |
| `categoryTile` | 150×200px | Portrait tile (~75px wide @2×) |
| `personPhoto` | 200×252px | ~4:5 (Persons block @2×; also used in Columns) |
| `mobileMediaImage` | 768×432px | 16:9 optional mobile media alternative |
| `promoTile` | 224×160px | ~7:5 VA Thuis promo (112×80 @2×) |
| `vathuisHero` | 1200×900px | 4:3 VA Thuis hero |
| `plpBanner` | 1600×400px | Full-width PLP banner (~20% opacity) |
| `logo` | SVG or ~320×48px | Horizontal header / JSON-LD |

## Field mapping

| Schema | Field | Spec | Frontend |
|--------|-------|------|----------|
| `seo` | `metaImage` | `social` | OG / Twitter (`seo-metadata.ts`) |
| `generalSettings` | `header.logo` | `logo` | `HeaderNav.tsx` |
| `generalSettings` | `organization.logo` | `logo` | Organization JSON-LD |
| `generalSettings` | `account.loginImage` | `loginPortrait` | Login page left panel |
| `person` | `photo` | `personPhoto` | `PersonsBlock.tsx` |
| `category` | `image` | `categoryTile` | Category tiles / search |
| `heroBlock` | `slides[].backgroundImage` | `heroSlide` | `HeroBlock.tsx` slider |
| `heroBlock` | `topPanelImage` | `heroTopPanel` | `HeroBlock.tsx` top panel |
| `afbeeldingBlock` | `image` | `blockImageAspectRatio` | `AfbeeldingBlock.tsx` |
| `afbeeldingBlock` | `placeholderImage` | `blockImageAspectRatio` | YouTube poster |
| `editorialCardsBlock` | `backgroundImage` | `editorialBackground` | `EditorialCardsBlock.tsx` |
| `editorialCardsBlock` | `cards[].image` | `editorialCard` | `EditorialCardsBlock.tsx` |
| `columnsBlock` | `columns[].mediaImage` | `blockImageAspectRatio` | `ColumnsBlock.tsx` |
| `columnsBlock` | `columns[].mediaMobileImageAsset` | `mobileMediaImage` | `ColumnsBlock.tsx` |
| `columnsBlock` | `columns[].highlightImage` | `blockImage16x9` | `ColumnsBlock.tsx` |
| `columnsBlock` | `columns[].ctaCardBgImage` | `blockImage16x9` | `ColumnsBlock.tsx` |
| `categoriesBlock` | `items[].image` | `categoryTile` | `CategoriesBlock.tsx` |
| `plpBlock` | `banner.image` | `plpBanner` | `PlpBanner.tsx` |
| `vathuisHeroBlock` | `image` | `vathuisHero` | `VaThuisHero.tsx` |
| `vathuisPromoTilesBlock` | `tiles[].image` | `promoTile` | `VaThuisPromoTiles.tsx` |

**Not Sanity uploads:** Medusa mirror fields (`category.imageUrl`, `product.thumbnailUrl`, `docent.photoUrl`, etc.) are URL strings synced from Salesforce/Medusa.

## Adding guidance to a new image field

```ts
import { defineImageField } from "../objects/imageField"

defineImageField({
  name: "image",
  title: "Image",
  spec: "blockImage16x9",
  extraDescription: "Optional extra context for editors.",
  options: { hotspot: true },
})
```

For `imageWithAlt` fields, use `defineImageWithAltField` with the same `spec` / `extraDescription` options.

If a new usage needs a new size, add an entry to `IMAGE_SPECS` in `imageSpecs.ts` and document it in this file.
