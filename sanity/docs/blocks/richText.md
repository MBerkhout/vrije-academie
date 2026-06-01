# Rich Text Block

## Purpose

Portable Text content block for formatted text content. Supports headings, bold, italic, links, and blockquotes.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (0-64px or custom) |
| Margin Bottom | String | No | Bottom margin (0-64px or custom) |
| Width | String | No | Full width or container |
| Background Color | String | No | Block background color |
| Content | Portable Text | Yes | Formatted text content |

## Supported Formatting

### Styles
- Normal (body text)
- H1 (page title)
- H2 (section heading)
- H3 (subsection heading)
- Blockquote (quoted text)

### Marks
- **Bold** (strong)
- *Italic* (emphasis)
- [Links](url)
- Inline Button (Primary, Secondary, or Text Link; displays as a styled button in the editor)

## When to Use

- Body text sections
- Article-style content
- Long-form text content
- Descriptions and explanations

## Related: Afbeelding Block

The Afbeelding (Image) block supports:

- Media type: Image or YouTube Video (VA-style button select)
- Width & aspect ratio: VA-style button selects
- Placeholder image for YouTube videos (click-to-play poster)
- Conditional visibility: only relevant fields show per media type

## Example Usage

**Article Introduction**:
```
Rich Text Block
├── Margin: Top 24px, Bottom 16px
├── Width: Container
└── Content:
    H2: "Over de Vrije Academie"
    Normal: "De Vrije Academie is een culturele instelling..."
    Normal: "Sinds 1947 bieden wij..."
```

**Quoted Text**:
```
Rich Text Block
├── Margin: Top 32px, Bottom 32px
├── Width: Container
└── Content:
    Blockquote: "Kunst is niet wat je ziet, maar wat je anderen laat zien."
```

## Best Practices

- Use H2 for major section headings
- Keep paragraphs concise (3-4 sentences)
- Use blockquotes for testimonials or important quotes
- Add links to related content
