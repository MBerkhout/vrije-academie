# Vrije Academie Sanity CMS

Sanity Studio for managing content for the Vrije Academie website.

## Overview

This Sanity Studio provides a block-based content management system where pages are built from reusable content blocks. Each block is configurable with margins, width, and background colors.

## Architecture

### List fields in Studio

Discrete string (and some number) fields with a **fixed set of options** use the shared **button group** custom input (`src/components/ButtonSelectInput.tsx`) instead of the default `<select>`, so editors do not get an extra blank “unset” row at the top.

### CTA and navigation URLs

Fields titled **CTA URL** (and related link fields) use `defineCtaUrlField` from `src/schemas/objects/ctaUrl.ts` (`type: string`), not Sanity’s `url` type. Editors can enter site paths (`/ons-aanbod`, `/ons-aanbod?record_type=collegereeks`) or absolute `http(s)://` / `mailto:` URLs. YouTube, social, and form-endpoint fields stay on `type: url`.

### Block System

Pages are composed of **blocks** - reusable content components that can be arranged in any order. Each block is a separate document type with:

- **Shared fields**: Margin (top/bottom), width, background color
- **Block-specific fields**: Content unique to each block type

### Document Types

- **Page**: Main page documents with an array of content blocks. The PLP route (`/ons-aanbod`) is edited as Page `pageOnsAanbod` with a [PLP block](./PLP.md) (`plpBlock`). The gift card purchase page uses Page `pageCadeaubon` with a [Cadeaubon block](./CADEAUBON.md) (`giftCardBlock`); URL = Page slug.
- **Redirect**: URL redirect rules for the storefront. See [REDIRECTS.md](./REDIRECTS.md).
- **General Settings**: Site-wide settings (header, footer, menus)
- **Menu**: Reusable menu structures

### Mock footer menus (optional)

Seven **Menu** documents with “(mock)” in the title can seed the footer (top two columns + five bottom columns). If you use **Sanity MCP** to create them, wire **General settings → Footer** manually when cloud schema deploy is unavailable, or run:

```bash
SANITY_API_WRITE_TOKEN=… npm run seed:footer-settings --prefix sanity
```

Default menu IDs match MCP-created drafts that were published on dataset `production` (override with `MENU_FOOTER_*` env vars if yours differ). Requires schema with `footerColumn` / `footerSocialLink` array object names (`generalSettings` footer fields).
- **Blocks**: Individual content blocks (hero, richText, imageBlock, etc.)
- **Person**: Teamleden / docenten / gastsprekers. Veld **Type** (`personType`) is verplicht en kiest één waarde: Docent, Team of Gastspreker (niet combineerbaar). Bestaande inhoud met het oude `typeTags`-veld: `npm run migrate:person-type` in de `sanity`-map (zie script voor benodigde env-vars).

## Setup

### Prerequisites

- Node.js 18+
- Sanity account (for project ID)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
# Presentation preview (hosted default: https://frontend-va.thedigitalimprover.nl)
SANITY_STUDIO_PREVIEW_URL=http://localhost:3001
```

### Development

```bash
npm run dev
```

Studio will be available at `http://localhost:3333/studio`

### Deploy Studio

```bash
npm run deploy
```

CI uses `sanity deploy --yes`; set `studioHost` via `SANITY_STUDIO_HOSTNAME` or `SANITY_STUDIO_PROJECT_ID` in `sanity.cli.ts` (defaults to project ID → `https://<id>.sanity.studio`).

`basePath: "/studio"` lives in `sanity.config.ts` only (not `sanity.cli.ts` `project.basePath`) so hosted static assets resolve at `/static/*`. See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) if the dashboard shows a white screen.

### Deploy Schema

```bash
npm run schema:deploy
```

## Block Types

See [BLOCKS.md](./BLOCKS.md) for a complete catalog of available blocks.

### Phase 1 Blocks (Dynamic Content)

- **Hero** - Hero banner with image, title, and CTA
- **Rich Text** - Portable Text content block
- **Image** - Single image with caption
- **Columns** - Multi-column layout (supports nested blocks)
- **Content Card** - Card component with image, title, description, link
- **Call to Action** - CTA block with title, description, button
- **Event List** - Dynamic list of events from Medusa

## Block Configuration

All blocks share these configurable fields:

### Margins

- **Margin Top/Bottom**: Preset values (0px, 8px, 16px, 24px, 32px, 48px, 64px) or custom value
- Default: 0px

### Width

- **Full Width**: Spans entire viewport
- **Container**: Constrained to max-width container
- Default: Container

### Background Color

- None (transparent)
- Light Gray (`va-lightgray`)
- White (`va-white`)
- Black (`va-black`)
- Default: None

## General Settings

The `generalSettings` document contains:

- **Header**
  - **Logo (override)**: Optional Sanity image; when empty, the frontend uses the bundled VA monogram + wordmark from `/public/branding`.
  - **Main menu**: Full navigation (desktop row + mobile drawer), e.g. Home, Ons aanbod, Agenda, VAthuis, Over ons, Vragen?, Cadeaubon. Use internal paths (e.g. `/agenda`) or **External Link** for outbound URLs.
  - **Top utility menu (desktop)**: Text links top-right, e.g. Huis Vasari, Login, Winkelwagen. The cart item count badge appears next to the link whose URL matches **Cart URL**.
  - **Mobile quick bar (3 items)**: Yellow bar on small screens only, e.g. Ons aanbod, VA Thuis, Login.
  - **Search placeholder**: Desktop search field and mobile search overlay (default “Zoek”).
  - **Vaak gezocht**: Optional shortcuts (label + internal or external link) listed under the search field in the search overlay; submit runs on **Enter** (no separate Zoek button).
  - **Cart URL**: Path for cart icon + badge matching (default `/winkelwagen`).
  - **Sticky header**: Optional `position: sticky` behavior.
- **Footer**
  - **Footer top — link column 1**: Primary quick links (yellow rule). **Juridisch / praktisch** links live in the bottom row (see below), not beside this column.
  - **Footer — juridisch / praktisch menu**: Menu for Voorwaarden, Privacy, Adverteren, etc. Rendered in the **bottom** footer row (heading from **Footer bottom — legal column heading**, default “Juridisch”). Do not add a separate “Nieuwsbrief” column; that slot is replaced on the site by this block.
  - **Footer bottom — legal column heading**: Title above the juridisch links.
  - **Blijf op de hoogte (desktop)**: Optional POST/GET URL + field names; on **large screens only**, shows voornaam, achternaam, e-mail + Aanmelden next to the primary top column.
  - **Contact**: Address, phone line, availability, intro + email (mailto).
  - **Footer columns (bottom row)**: Heading + menu per column (e.g. Klantenservice, Populaire activiteiten). Omit a Nieuwsbrief column—the frontend drops it if still present.
  - **Copyright**: Optional; use `{year}` placeholder or leave empty for a default line with the current year.
  - **Social links**: Facebook, Instagram, LinkedIn, etc.; icons open in a new tab.

## Menus

Menus are reusable document types that can be referenced in:
- Header (main menu, utility row, mobile quick bar)
- Footer (top primary column, juridisch menu for bottom row, and each other bottom column)
- Anywhere else needed

Menu items support:
- Labels and links (internal path or **External Link**)
- Stored rows use schema types **`menuItem`** (top level) and **`menuSubItem`** (nested); API / Studio need this for strict validation (e.g. MCP patches).
- **Highlighted in mobile menu**: Optional accent background in the full-screen nav (e.g. gift card).
- Nested submenu items (schema-supported; the current header renders top-level links)

## Visual Editing

The Studio includes the Presentation tool for visual editing with the Next.js frontend. Content creators can see live previews and edit content directly in context.

## Schema Structure

```
src/schemas/
├── index.ts              # Schema exports
├── page.ts               # Page document
├── generalSettings.ts    # General settings
├── menu.ts               # Menu document
└── blocks/
    ├── hero.ts
    ├── richText.ts
    ├── imageBlock.ts
    ├── columns.ts
    ├── contentCard.ts
    ├── ctaBlock.ts
    └── eventList.ts
```

## Documentation

- [BLOCKS.md](./BLOCKS.md) - Complete block catalog with usage examples
- [REDIRECTS.md](./REDIRECTS.md) - URL redirects and delete-with-redirect flow
- [blocks/](./blocks/) - Individual block documentation
- [OPEN_POINTS.md](./OPEN_POINTS.md) - Future considerations

## Adding New Blocks

1. Create block schema in `src/schemas/blocks/<blockName>.ts`
2. Import `blockFields` from `../../lib/blockFields`
3. Add block-specific fields
4. Export and add to `src/schemas/index.ts`
5. Add to page schema's `blocks` array
6. Create documentation in `docs/blocks/<blockName>.md`

See existing blocks for examples.
