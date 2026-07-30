# Columns Block

## Purpose

Multi-column layout that supports nested blocks within each column. Enables side-by-side content organization.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (0-64px or custom) |
| Margin Bottom | String | No | Bottom margin (0-64px or custom) |
| Width | String | No | Full width or container |
| Background Color | String | No | Block background color |
| Section Title | String | No | Optional heading |
| Heading size | String | Yes when title set | H1–H4 (button select, same as Text block) |
| Heading alignment | String | Yes when title set | Left / center / right (button select) |
| Column Count | Number | Yes | 1–4 (horizontal radio, 4…1 in Studio) |
| Column Gap | String | No | sm / md / lg |
| Columns | Array | Yes | Column objects (type + width + vertical alignment + content); length must match **Column Count** (validated against the live form value). |

Each column object: **Width** (equal / narrow / wide), **Vertical alignment** (top / center / bottom), **Column type** (text, media, highlight card, product cards, CTA card, person card) and type-specific fields. Text / highlight / CTA titles use **Heading size** (H1–H4 button select, same as Text block) when a title is set.

**Column width:** With **two or more** columns, Width controls each column’s **relative** share of the row (flex). With **one** column only, Equal and Wide keep full block width; **Narrow** limits content to a readable measure (~600px), similar to the Text block’s “Narrow” content width.

## Column types (content)

Each column is one of: Text, Media, Highlight card, Product cards, CTA card, Person card—not arbitrary nested blocks.

## When to Use

- Side-by-side content comparison
- Multi-column text layouts
- Complex content organization
- Responsive grid layouts

## Example Usage

**Two-Column Layout**:
```
Columns Block (2 columns)
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Column Count: 2
└── Columns:
    ├── Column 1:
    │   ├── Rich Text: "Over de cursus..."
    │   └── Image: [Course image]
    └── Column 2:
        ├── Content Card: [Related event]
        └── CTA Block: [Sign up CTA]
```

**Three-Column Event Grid**:
```
Columns Block (3 columns)
├── Margin: Top 24px, Bottom 24px
├── Width: Container
├── Column Count: 3
└── Columns:
    ├── Column 1: Content Card [Event 1]
    ├── Column 2: Content Card [Event 2]
    └── Column 3: Content Card [Event 3]
```

## Best Practices

- Keep column count reasonable (2-3 columns recommended)
- Ensure nested content is balanced across columns
- Test responsive behavior (columns stack on mobile)
- Avoid deep nesting (2-3 levels max)
- Use consistent spacing within columns
- Match image uploads to column type — see [IMAGE_SIZES.md](../IMAGE_SIZES.md) (media: aspect ratio field; highlight/CTA cards: 1200×675px)
