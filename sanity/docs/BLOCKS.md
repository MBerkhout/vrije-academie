# Block Catalog

Complete reference for all available content blocks in the Vrije Academie CMS.

## Overview

Blocks are reusable content components that can be arranged on pages. Each block has shared configuration (margins, width, background) and block-specific content fields.

## Block Index

- [Hero](#hero) - Hero banner with image, title, CTA
- [Rich Text](#rich-text) - Portable Text content
- [Image](#image) - Single image with caption
- [FAQ / Accordion](#faq--accordion) - Expandable Q&A pairs
- [Tabs](#tabs) - Tabbed content with per-tab blocks or rich text
- [Reviews](#reviews) - Participant quotes with optional overall score and carousel navigation
- [Persons](#persons) - Person grid (manual or dynamic); optional on-page search
- [Columns](#columns) - Multi-column layout (supports nested blocks)
- [Content Card](#content-card) - Card component
- [Call to Action](#call-to-action) - CTA block
- [Event List](#event-list) - Dynamic event listing
- [Demand Nearby](#demand-nearby) - Postcode search → results page
- [PLP (Ons aanbod)](#plp-ons-aanbod) - Banner, intro, tabs voor de product listing `/ons-aanbod`
- [Productkaarten](#productkaarten) - Carousel of 4 product cards (handpicked, automated, or personalized)
- [Cadeaubon (koop)](#cadeaubon-koop) - Teksten en bedragen voor de cadeaubon-kooppagina `/cadeaubon`

## Shared Block Fields

All blocks include these fields:

| Field | Type | Options | Default |
|-------|------|---------|---------|
| Margin Top | String | 0, 8, 16, 24, 32, 48, 64, custom | 0 |
| Margin Top Custom | Number | Any px value | - |
| Margin Bottom | String | 0, 8, 16, 24, 32, 48, 64, custom | 0 |
| Margin Bottom Custom | Number | Any px value | - |
| Width | String | full, container | container |
| Background Color | String | none, va-lightgray, va-white, va-black | none |

---

## Hero

**Purpose**: Full-width hero with **slider** (image, title, subtitle, optional slide link), **top panel** (title, rich text, optional CTA, optional image to the right with yellow divider), and a **newsletter teaser** sentence (no form).

**Use when**: 
- Creating landing page hero sections
- Highlighting featured content
- Page headers with strong visual impact

**Fields** (see [blocks/hero.md](./blocks/hero.md)):
- Slides (1–5), autoplay
- Top panel: title, body, optional right image, optional CTA

**Documentation**: [blocks/hero.md](./blocks/hero.md)

---

## Rich Text

**Purpose**: Portable Text content block for formatted text content.

**Use when**:
- Adding body text to pages
- Creating article-style content
- Long-form text sections

**Fields**:
- Content: Portable Text array (supports headings, bold, italic, links)

**Supported Styles**:
- Normal, H1, H2, H3, Blockquote

**Supported Marks**:
- Bold, Italic
- Links

**Example Usage**:
```
Rich Text Block
├── Margin: Top 24px, Bottom 24px
├── Width: Container
└── Content: [Portable Text with formatting]
```

**Documentation**: [blocks/richText.md](./blocks/richText.md)

---

## Image

**Purpose**: Single image display with optional caption and alt text.

**Use when**:
- Displaying standalone images
- Adding visual breaks in content
- Showcasing artwork or photography

**Fields**:
- Image (required)
- Caption (optional)
- Alt Text (optional, recommended for accessibility)

**Example Usage**:
```
Image Block
├── Margin: Top 16px, Bottom 16px
├── Width: Container
├── Image: [Image asset]
├── Caption: "Portrait by Rembrandt, 1642"
└── Alt: "Portrait of a young woman"
```

**Documentation**: [blocks/imageBlock.md](./blocks/imageBlock.md)

---

## FAQ / Accordion

**Purpose**: Expandable question-and-answer pairs for FAQs and collapsible content.

**Use when**:
- FAQ sections
- Collapsible explanations
- Long lists with per-item details

**Fields**:
- Section Title (optional)
- Items: array of { Question, Answer (Portable Text) }
- Allow Multiple Open: when off, opening one closes others
- Layout: margins, padding, width, background

**Available in**: Page blocks; also inside Tabs block tab content.

**Documentation**: [blocks/accordionBlock.md](./blocks/accordionBlock.md)

---

## Tabs

**Purpose**: Either **tabbed panels** (content inside this block) or **in-page navigation** (only link labels; targets are other blocks on the same page).

**Mode** (Content): **Tabs** — same as before: each tab has label + nested blocks (same set as pages, minus hero and nested tabs). **In-page navigation** — 2–20 items with **Label** + optional **Page or URL** and/or **Section ID (same page)**. Set **Page or URL** (e.g. `/over-ons/docenten`, `https://…`, `mailto:…`) to go to another page; if that field is empty, set **Section ID** to match **Section ID** in Style → Layout on a block on the **current** page (no `#` in the CMS; normalized on the site). If both are set, the URL is used. **Content beside navigation** appears only when **Tab labels** = Left (main column next to the menu; same block set as a tab).

**Fields**: Title, mode, tabs *or* navigation links, width, **Tab labels** position (top / left; applies to both modes), anchor navigation (tabs mode only: `#` opens a tab).

---

## Categories

**Purpose**: Grid of category tiles (library entries or custom label/image/URL).

**Studio**: Each item in **Items** shows a list preview title (referenced category **Label** or custom **Label**), not “Untitled”.

**Frontend**: Blocks stored **inline** on a page (no `_ref` on the block) still need GROQ to expand `items[].category->` (including `slug`, optional **Custom title**, `image`); see `INLINE_PAGE_BLOCK_LAYOUT` / inline branches in `frontend/src/lib/cms/page-query.ts`. Bibliotheek tiles link to `/ons-aanbod/{slug}` by default, or to **`linkUrl`** when set on the mirrored category. Tile label uses the category **Custom title** when set, otherwise Medusa **Label**.

**Homepage seed**: To wire the eight “Populaire vakgebieden” tiles (library refs + editorial images from [vrijeacademie.nl](https://www.vrijeacademie.nl/)), run `npm run seed:homepage-categories --prefix sanity` (requires `SANITY_API_WRITE_TOKEN`). Images are stored on mirrored `category` documents (`image`), not on block items. After changing category images or SEO in Studio, run `npm run search:reindex --prefix medusa` (or rely on the Sanity search webhook) so header search picks up thumbnails.

---

## USP

**Purpose**: Three selling points in a row or column layout, edited inline per block (title, description, optional link per item).

**GROQ**: `page-query.ts` projects inline item fields only; the frontend renders title, description, and optional link (no icons).

**Migration**: Run `npm run migrate:usp-inline --prefix sanity` once when upgrading from the legacy USP library model.

---

## Reviews

**Purpose**: Testimonial quotes with optional star rating per item, optional **overall score** (number + label), and carousel navigation.

**Frontend** (see `frontend/docs/components.md`): From **`md`**, the overall score sits **to the left** in its **own card** with a **yellow bottom bar**; the quote card matches (square corners, **yellow bottom bar**, warm background). **Larger arrows** flank the quote; **dots** render below when enabled.

---

## Persons

**Purpose**: Grid of **Person** documents (manual selection or dynamic filters by type/subject).

**Search on page**: Optional **Search on page** shows a field above the grid; the frontend filters loaded persons by name, role, bio and type (client-side only). Optional **Search placeholder** overrides the default Dutch placeholder.

---

## Columns

**Purpose**: Multi-column layout that supports nested blocks within each column.

**Use when**:
- Creating side-by-side content
- Building complex layouts
- Organizing related content

**Fields**:
- Section title (optional): **Heading size** and **Heading alignment** (same button-select UI as the Text block)
- **Number of columns**: 1–4, horizontal radio (order 4 → 1 in Studio)
- **Column gap** (sm / md / lg)
- **Columns**: per column — **Width** (Equal / Narrow / Wide, horizontal radio), **Vertical alignment** (Top / Center / Bottom), then type-specific content (text with title size radios, media, highlight, product cards, CTA card, person card)

**Frontend**: From `md` up, columns are a horizontal flex row with proportional widths; **vertical alignment** applies within the row. On small screens, columns stack. Inline `columnsBlock` on pages (and columns inside tabs) uses a dedicated GROQ branch so **`person->`** and other column references resolve—same idea as categories/persons inline blocks.

**Nested column types**:
- Text, Media, Highlight card, Product cards, CTA card, Person card (not arbitrary nested blocks)

**Product cards column**: Pick up to three mirrored **Product** references; optional **Card CTA label** (same text on each card, e.g. “VAthuis – ON DEMAND”). Frontend uses `thumbnailUrl`, `handle`, and `plpProductPath`. Seed homepage trio: `npm run seed:homepage-product-columns --prefix sanity`.

**Example Usage**:
```
Columns Block (2 columns)
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Column Count: 2
└── Columns:
    ├── Column 1:
    │   ├── Rich Text Block
    │   └── Image Block
    └── Column 2:
        ├── Content Card
        └── CTA Block
```

**Documentation**: [blocks/columns.md](./blocks/columns.md)

---

## Content Card

**Purpose**: Card component with image, title, description, and link.

**Use when**:
- Creating card grids
- Linking to related content
- Showcasing events or courses

**Fields**:
- Title (required)
- Image (optional)
- Description (optional)
- Link (optional)
- Link Text (default: "Bekijk meer")

**Example Usage**:
```
Content Card Block
├── Margin: Top 16px, Bottom 16px
├── Width: Container
├── Title: "Colleges 8 Planeten door Govert Schilling"
├── Image: [Event image]
├── Description: "Een reeks colleges over..."
└── Link: /events/planeten → "Bekijk meer"
```

**Documentation**: [blocks/contentCard.md](./blocks/contentCard.md)

---

## Call to Action

**Purpose**: CTA block with title, description, and prominent button.

**Use when**:
- Encouraging specific actions
- Highlighting important links
- Conversion-focused sections

**Fields**:
- Title (required)
- Description (optional)
- Button:
  - Label (required)
  - Link (required)
  - Style: Primary (Yellow) or Secondary (Gold)

**Example Usage**:
```
CTA Block
├── Margin: Top 48px, Bottom 48px
├── Width: Container
├── Background: va-lightgray
├── Title: "Schrijf je nu in"
├── Description: "Beperkt aantal plaatsen beschikbaar"
└── Button: "Inschrijven" (Primary) → /register
```

**Documentation**: [blocks/ctaBlock.md](./blocks/ctaBlock.md)

---

## Event List

**Purpose**: Dynamic list of events fetched from Medusa.

**Use when**:
- Displaying event listings
- Creating event archive pages
- Filtering events by category or type

**Fields**:
- Section Title (optional)
- Filter by Category (optional)
- Filter by Type: All, Online Only, Offline Only
- Limit: Maximum number of events
- Show Past Events: Boolean

**Example Usage**:
```
Event List Block
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Title: "Aankomende Collegereeksen"
├── Category: "Collegereeksen"
├── Type: All
├── Limit: 10
└── Show Past Events: false
```

**Documentation**: [blocks/eventList.md](./blocks/eventList.md)

---

## Demand Nearby

**Purpose**: Let visitors enter a Dutch postcode and go to the configured results page with `?postcode=`.

**Fields (Studio)**: Optional section title (fieldset with button-style title size), optional intro (Portable Text), plus shared layout.

**Copy and results URL**: Not in Sanity—see `frontend/src/content/form-strings.json` (`demandNearby`). **Documentation**: [blocks/demandNearby.md](./blocks/demandNearby.md)

---

## PLP (Ons aanbod)

**Purpose**: Editorial shell for the storefront PLP: optional promotional banner, intro (Portable Text), and tab links (e.g. Ons aanbod / Agenda).

**Use when**: Only on the dedicated Page for `/ons-aanbod` (document id `pageOnsAanbod`, see [PLP.md](./PLP.md)). Not for arbitrary marketing pages.

**Fields**: Banner (enable + image, title, CTA), intro, tabs. Page-level **SEO** lives on the parent Page, not in this block.

**Documentation**: [PLP.md](./PLP.md)

---

## Cadeaubon (koop)

**Purpose**: Labels, amount limits, and intro for the digital gift card purchase form on `/cadeaubon`.

**Use when**: Only on the dedicated Page for `/cadeaubon` (document id `pageCadeaubon`, see [CADEAUBON.md](./CADEAUBON.md)).

**Fields**: Page title, **Grootte paginatitel** (H1–H4, zelfde typografie als andere blokken), intro, amount presets, min/max euro, section headings, form field labels, order button. **SEO** on the parent Page.

**Documentation**: [CADEAUBON.md](./CADEAUBON.md)

---

## Productkaarten

**Purpose**: Horizontal carousel of four commerce product cards on page surfaces (homepage, landing pages).

**Use when**:
- Highlighting curated products (e.g. travel picks)
- Showing bestsellers or newest courses
- Personalizing for logged-in visitors (saved items or recently viewed)

**Fields**:
- Title, title size
- Source: handpicked (4 product refs), automated (`bestsellers` | `newest`), or personalized
- Personalized: optional separate titles for favorites vs recently viewed
- Optional footer CTA (label + URL)

**Documentation**: [block-layout.md](./block-layout.md#productkaarten--productrowblock)

---

## Best Practices

### Margin Usage

- Use consistent margins between related blocks (e.g., 16px or 24px)
- Larger margins (48px, 64px) for major section breaks
- Custom margins when precise spacing is needed

### Width Selection

- **Full Width**: Use for hero sections, full-bleed images, backgrounds
- **Container**: Use for text content, cards, most standard content

### Background Colors

- Use backgrounds sparingly to create visual hierarchy
- `va-lightgray` for subtle section separation
- `va-black` for high-contrast sections

### Nested Blocks

- Columns support nesting any block type
- Keep nesting depth reasonable (2-3 levels max)
- Test responsive behavior when nesting complex layouts

## Adding Blocks to Pages

1. Open a Page document
2. Click "Add item" in the Blocks array
3. Select block type
4. Configure shared fields (margins, width, background)
5. Fill in block-specific content
6. Save and preview
