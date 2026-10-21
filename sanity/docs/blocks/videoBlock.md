# Video Block

## Purpose

Hosted **MP4** video with the same layout controls as the Afbeelding block: width, aspect ratio, caption, and block layout. Plays automatically (muted, loop, inline) on the storefront.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Video (MP4) | File | Yes | H.264 MP4 upload (`video/mp4` only) |
| Poster Image | Image | No | Shown before playback and when the user prefers reduced motion |
| Caption | String | No | Visible under the video; also used as accessible name when set |
| Width | String | No | Narrow / Normal / Wide (VA-style buttons) |
| Aspect Ratio | String | No | 16:9, 4:3, 1:1, or Free |
| Layout | Object | No | Margin, padding, width, background color |

## Storefront behavior

- **Autoplay**: `autoplay`, `muted`, `playsInline`, `loop` (browsers require mute for autoplay).
- **Reduced motion**: If `prefers-reduced-motion: reduce`, autoplay is disabled; poster is shown when set, otherwise the video is shown with controls.
- **Aspect ratio**: Fixed ratios crop with `object-cover` (same as Afbeelding images). **Free** uses `object-contain`.

## When to Use

- Short ambient or decorative loops
- Product or brand motion clips where YouTube is not desired

## Best Practices

- Keep file size modest for mobile (rough target: under ~5–10 MB for short loops).
- Upload a **poster** that matches the chosen aspect ratio — see [IMAGE_SIZES.md](../IMAGE_SIZES.md).
- Use **Caption** for context; it improves accessibility when set.

## Surfaces

- **Page** body blocks
- **PDP** body blocks
- **Tabs** nested blocks (same set as other nested page blocks)
