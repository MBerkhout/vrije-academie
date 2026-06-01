# Content Card Block

## Purpose

Card component with image, title, description, and link. Used for displaying related content, events, or navigation cards.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (0-64px or custom) |
| Margin Bottom | String | No | Bottom margin (0-64px or custom) |
| Width | String | No | Full width or container |
| Background Color | String | No | Block background color |
| Title | String | Yes | Card title |
| Image | Image | No | Card image |
| Description | Text | No | Card description text |
| Link | String | No | Destination URL |
| Link Text | String | No | Link label (default: "Bekijk meer") |

## When to Use

- Event listings
- Course cards
- Related content links
- Navigation cards
- Content grids

## Example Usage

**Event Card**:
```
Content Card Block
├── Margin: Top 16px, Bottom 16px
├── Width: Container
├── Title: "Colleges 8 Planeten door Govert Schilling"
├── Image: [Event image]
├── Description: "Een reeks colleges over de planeten..."
├── Link: /events/planeten
└── Link Text: "Bekijk meer"
```

**Course Card**:
```
Content Card Block
├── Margin: Top 24px, Bottom 24px
├── Width: Container
├── Title: "Kunstgeschiedenis Jaaropleiding"
├── Image: [Course image]
├── Description: "Een intensieve jaaropleiding..."
├── Link: /courses/kunstgeschiedenis
└── Link Text: "Meer informatie"
```

## Design Notes

- Cards typically use white background
- Images should be consistent aspect ratio in grids
- Link text uses gold color with arrow indicator
- Description should be concise (1-2 sentences)
