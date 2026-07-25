# FAQ / Accordion Block

## Purpose

Expandable question-and-answer pairs for FAQs and collapsible content.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Section Title | String | No | Optional heading above the accordion |
| Title Size | String | No | `h1`–`h4`, defaults to `h3`. Only shown when a title is set |
| Items | Array | Yes | Question & answer pairs |
| └ Question | String | Yes | Max 120 chars |
| └ Answer | Portable Text | Yes | Rich text (links, formatting) |
| Allow Multiple Open | Boolean | No | When off, opening one closes others. Default: false |
| FAQ structured data | Boolean | No | When enabled (default), contributes to `FAQPage` JSON-LD on the page. Set to false to opt out. |
| Layout | Object | No | Margin, padding, width, background |

## Behaviour & Animation

- The trigger button shows a **+/−** icon that morphs via a CSS scale/opacity transition (vertical bar fades out when open)
- The answer panel animates open/closed using the CSS `grid-template-rows: 0fr → 1fr` trick — no JS height calculation needed
- When `allowMultipleOpen` is `false` (default), opening one item automatically closes the previously open item

## Schema.org (SEO)

FAQ structured data is emitted as **JSON-LD** on the page (not microdata in the component). The storefront collects Q&A pairs from accordion blocks where `enableStructuredData` is not `false`, via `buildFaqPageJsonLd()` in `frontend/src/lib/cms/page-structured-data.ts`.

## When to Use

- FAQ sections
- Collapsible explanations
- Long lists with per-item details

## Available In

- Page blocks (top-level)
- Tab content (inside Tabs block)

## Example Usage

```
Accordion Block
├── Title: "Veelgestelde vragen"
├── Allow Multiple Open: false
├── FAQ structured data: true
├── Items:
│   ├── Q: "Hoe meld ik me aan?" → A: [Rich text]
│   ├── Q: "Wat zijn de betalingsmogelijkheden?" → A: [Rich text]
│   └── Q: "Is er een annuleringsregeling?" → A: [Rich text]
└── Layout: Margin 24px top/bottom
```
