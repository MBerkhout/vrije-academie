# Block Layout

Block layout controls spacing, width, and background for block types (e.g. Event List). Uses a custom input with:

- **Content / Style tabs**: Content tab for block-specific fields; Style tab for layout options.
- **Margin & Padding**: Button grid for common values (0, 8, 16, 24, 32, 48, 64px) plus Custom with number input.
- **Width**: Two illustrated buttons – Full width (edge-to-edge) vs Container (max-width centered).
- **Background**: None, Light Gray, White, Black.
- **Section ID (in-page link)**: Optional. When set, the block’s outer wrapper gets this as a normalized `id` (for `#` links). Use the same value as **Link target** on an **In-page navigation** item in the Tabs block (Mode: In-page navigation).

## Per-block defaults

Use `createLayoutField(defaults)` to set defaults per block type:

```ts
createLayoutField({ marginTop: "24", marginBottom: "24" })
```

## Adding layout to a new block

1. Add `groups` and `createLayoutField()` to the block schema.
2. Assign all fields (content + layout) to the same fieldset (e.g. `fieldset: "content"`). Note: When blocks are edited inline in arrays, a second fieldset may not render; keep layout in the main fieldset.

## Frontend mapping

The frontend `blockLayout.ts` supports both flat (GROQ projection) and nested (`layout.*`) shapes. Background uses a static `BG_CLASS` map so Tailwind includes `bg-va-lightgray`, `bg-va-white`, `bg-va-black` at build time.

**Full width vs container:** Padding is applied per section. The page wrapper has no horizontal padding. Container blocks use `CONTAINER_CLASS` (`max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0`): horizontal padding only when the viewport is narrower than the max width, so wide screens do not shrink the 1240px column. Full-width blocks use `w-full` and span edge-to-edge.

## Redactionele promotiekaarten — `editorialCardsBlock`

- **Page only** (add via **Page → Content Blocks**), same as Hero and Uitgelichte reis.
- **Layout defaults:** Full width, 24px vertical margin, 48px vertical padding; block **background** stays none — the visual comes from the **achtergrondbeeld**.
- **Content:** Sectietitel (with underline style on the frontend), full-bleed **background image** + **overlay** (default **None**; light / medium / dark), **Titelgrootte** (default **None** for body-style text, or H1–H4), **2–4 cards** (grid shows the same number of columns as cards on large breakpoints). Each card: optional label, title, rich text, 16:9 image on top, optional link (label + URL). Cards are **white**, rounded, shadowed; entire card is clickable when a URL is set. Overlay and titelgrootte use the same button-style choices as other blocks (no blank row in a dropdown).

## Uitgelichte reis (magazine) — `featuredTripBlock`

- **Page only:** Add via **Page → Content Blocks** (not inside Tabs), same as Hero.
- **Layout defaults:** Full width, 24px top/bottom margin (adjust in Style). The **hero image** uses block full width, then an inner wrapper **`max-w-[1920px] mx-auto`** so the photo is edge-to-edge until that cap on very large screens.
- **Structure:** Hero image with **titel, ondertitel en rich text over het beeld** (donkere gradient onderaan voor leesbaarheid); de overlay staat in de **zelfde contentcontainer** (`max-w-[1240px]`) als andere blokken. **Titelgrootte** default is **H2** voor nieuwe blokken. Optioneel **Knop tonen** met **Knoplabel** + **Knop-URL** (primary-stijl op de site). Optionele witte **infokaart** (reisdata, prijs, **Person**): op desktop overlapt de kaart rechtsonder het beeld, op mobiel staat de kaart uitgelijnd in diezelfde container onder de hero.

## Deprecated blocks

- **Inspiration highlight** and **3 columns highlight** are deprecated. Use the Columns block with appropriate column presets. See frontend docs for mapping details.

## Testing

Schema helpers (e.g. `youtubeUrlRegex`, `extractYoutubeId`, `dutchPostcodeRegex` in `mediaEnums`) have unit tests. Run `npm run test:run` in the sanity package.
