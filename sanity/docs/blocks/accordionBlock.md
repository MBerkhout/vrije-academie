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
| Layout | Object | No | Margin, padding, width, background |

## Behaviour & Animation

- The trigger button shows a **+/−** icon that morphs via a CSS scale/opacity transition (vertical bar fades out when open)
- The answer panel animates open/closed using the CSS `grid-template-rows: 0fr → 1fr` trick — no JS height calculation needed
- When `allowMultipleOpen` is `false` (default), opening one item automatically closes the previously open item

## Schema.org (SEO)

The component automatically emits [FAQPage structured data](https://schema.org/FAQPage) via microdata attributes:

| Element | Attributes |
|---|---|
| Outer wrapper | `itemScope itemType="https://schema.org/FAQPage"` |
| Each item `<div>` | `itemScope itemProp="mainEntity" itemType="https://schema.org/Question"` |
| Question `<span>` | `itemProp="name"` |
| Answer wrapper | `itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"` |
| Answer inner `<div>` | `itemProp="text"` |

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
├── Items:
│   ├── Q: "Hoe meld ik me aan?" → A: [Rich text]
│   ├── Q: "Wat zijn de betalingsmogelijkheden?" → A: [Rich text]
│   └── Q: "Is er een annuleringsregeling?" → A: [Rich text]
└── Layout: Margin 24px top/bottom
```
