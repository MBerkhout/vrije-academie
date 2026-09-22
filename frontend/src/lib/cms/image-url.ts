/**
 * Sanity image URL builder - client-safe (no defineLive/server-only deps).
 * Use for building image URLs in client and server components.
 */

import { createClient } from '@sanity/client'
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2024-01-01',
})

const builder = createImageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

export const DEFAULT_SANITY_IMAGE_QUALITY = 80

export function sanityImageSrc(
  source: SanityImageSource,
  options: {
    width?: number
    height?: number
    fill?: boolean
    objectFit?: 'cover' | 'contain'
    quality?: number
    priority?: boolean
  } = {},
): string {
  const {
    width,
    height,
    fill = false,
    objectFit = 'cover',
    quality = DEFAULT_SANITY_IMAGE_QUALITY,
    priority = false,
  } = options

  const defaultWidth = priority ? 1920 : 1200
  const defaultHeight = priority ? 1080 : 675
  const image = urlFor(source).auto('format').quality(quality)

  if (width != null && height != null) {
    return image.width(width).height(height).url()
  }

  /**
   * `fill` / `contain` let CSS size the box. Forcing width+height here makes
   * Sanity crop to 16:9 (and upscale small assets), which goes soft in portrait
   * thumbs. `fit=max` downscales only — never upscales.
   */
  if (fill || objectFit === 'contain') {
    return image.width(width ?? defaultWidth).fit('max').url()
  }

  return image.width(width ?? defaultWidth).height(height ?? defaultHeight).url()
}
