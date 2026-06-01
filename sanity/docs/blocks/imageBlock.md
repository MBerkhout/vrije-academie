# Afbeelding Block

## Purpose

Single image or YouTube video with optional caption. Supports placeholder image for video (click-to-play).

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Media Type | String | Yes | Image or YouTube Video (VA-style buttons) |
| Image | Image | Yes* | Image asset with alt text (*when Media Type = Image) |
| YouTube URL | URL | Yes* | YouTube URL (*when Media Type = YouTube) |
| Placeholder Image | Image | No | Poster shown before video loads (*YouTube only) |
| Caption | String | No | Caption (visible for both media types) |
| Width | String | No | Narrow / Normal / Wide (VA-style buttons) |
| Aspect Ratio | String | No | 16:9, 4:3, 1:1, Free (VA-style buttons) |
| Layout | Object | No | Margin, padding, width, background color |

## When to Use

- Standalone images
- Visual breaks in content
- Showcasing artwork or photography
- Supporting content illustrations

## Example Usage

**Artwork Display**:
```
Image Block
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Image: [Rembrandt portrait]
├── Caption: "Portret van een jonge vrouw, Rembrandt, 1642"
└── Alt: "Portrait of a young woman by Rembrandt"
```

**Full-Width Hero Image**:
```
Image Block
├── Margin: Top 0px, Bottom 0px
├── Width: Full
├── Image: [Gallery interior]
└── Alt: "Interior of Vrije Academie gallery"
```

## Best Practices

- Always provide alt text for accessibility
- Use captions for context and attribution
- Optimize images before uploading
- Consider aspect ratio for layout
- Use full width sparingly for impact
