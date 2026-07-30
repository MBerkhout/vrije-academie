# Hero Block

## Purpose

Full-width hero section with an image slider and a right column: a **Top Panel** (headline, rich text, optional CTA, optional right-side image) and a **newsletter teaser** line. Used as the primary page header on the homepage.

## Layout

The hero is split into two columns:
- **Left (2/3):** Image slider with title, optional subtitle, yellow **chevron** previous/next controls at the bottom left and right, and dot navigation centered below.
- **Right (1/3):** **Top panel** and **newsletter** use the same chrome: **white** background, **border** only (no drop shadow). The top card has text (and CTA) on the left, optional **Image** on the right (full image visible, `contain` in the area—no yellow divider). The newsletter card has heading *Meld je aan*, subtext, and a primary **Aanmelden** button; the button URL is set in the **Newsletter** tab (**Aanmeldlink**).

## Fields

### Slider (tab)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Slides | Array (1–5) | Yes | Each slide: background image, overlay, optional logo, title, title size, optional subtitle, optional **Link URL** (whole slide becomes a link), content alignment |
| Autoplay | Boolean | No | Auto-advance slides (default: true) |
| Autoplay Interval | Number (2–15s) | No | Interval in seconds (default: 5) |

### Top Panel (tab)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | String | Yes | Panel headline |
| Title Size | String | No | `h2`–`h6` (default: `h2`) |
| Body | Portable Text | No | Rich text body (subtext / main copy) |
| Image | Image | No | Shown to the right of the text; displayed with **contain** in the area (no crop). Hotspot for focal point. Optional **alt text** (recommended for accessibility). Recommended: min. 800px wide — see [IMAGE_SIZES.md](../IMAGE_SIZES.md) |
| Show CTA | Boolean | No | Toggle CTA button visibility |
| CTA Label | String | No | Button text |
| CTA URL | String | No | Button destination (e.g. `/ons-aanbod` or `https://…`) |

### Newsletter (tab)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Aanmeldlink | URL | No | If set, the *Aanmelden* button navigates here. If empty, the button is shown disabled. |

### Style (tab)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (default: 0) |
| Margin Bottom | String | No | Bottom margin (default: 0) |

## Newsletter card

Copy is fixed: title **Meld je aan**, subtext **Schrijf je hier in voor onze nieuwsbrief!**, primary button **Aanmelden** (link from **Aanmeldlink** in the CMS). No form fields in this block.

## Design Notes

- On large viewports the slider column stretches to match the right column height so the image area aligns with the right column.
- The top panel uses a **white** card, light border, and the optional image sits beside the text on **all** breakpoints (text left, image right; no stripe between). The image uses **object-contain** so the full image fits without zoom-crop. The newsletter card matches the same white + border (no extra shadow on either card by default).
- Full-width layout adds horizontal padding on the hero grid; container width uses the block wrapper padding.
- Background images should be high-quality and optimized for performance; recommended **1200×675px (16:9)** for slide backgrounds — see [IMAGE_SIZES.md](../IMAGE_SIZES.md). Top panel image: min. **400px** wide (object-contain in narrow column). Overlay opacity controls slide text readability.
- CTA button uses the primary yellow style.
