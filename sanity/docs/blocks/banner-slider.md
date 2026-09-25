# Banner slider block

## Purpose

Full-width image slider (fixed **400px** height) for page headers or promotional strips. Same slide behaviour as the hero slider (title, subtitle, link, overlay, autoplay, yellow chevrons and dots), without the hero top panel or newsletter column.

## Layout

- **Width:** Defaults to **full** in the Style tab (edge-to-edge on the page).
- **Height:** Fixed at 400px on the frontend; use wide banner images (`object-cover`).
- Slide titles render as **H2** (the hero slider uses H1 on its slide titles).

## Fields

### Slider (tab)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Slides | Array (1–5) | Yes | Background image, overlay, title, optional subtitle, optional **Link URL**, content alignment |
| Autoplay | Boolean | No | Auto-advance slides (default: true) |
| Autoplay Interval | Number (2–15s) | No | Interval in seconds (default: 5) |

### Style (tab)

Shared layout fields (margins, width, background). Default width is **full**.

## Design notes

- Recommended slide background: **1920×400px** — see [IMAGE_SIZES.md](../IMAGE_SIZES.md).
- Not available inside tabs or columns (page-level block only).
- Analytics promotion slots use the prefix `banner_slider_*` (hero uses `homepage_jumbotron_*`).
