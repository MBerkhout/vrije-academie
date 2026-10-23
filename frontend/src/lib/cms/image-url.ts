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

/** Width and height encoded in a Sanity asset ref (`image-{id}-{w}x{h}-{ext}`). */
export function sanityAssetDimensions(
  source: { asset?: { _ref?: string } | unknown } | null | undefined,
): { width: number; height: number } | null {
  const asset = source?.asset
  const ref =
    asset && typeof asset === 'object' && '_ref' in asset
      ? String((asset as { _ref?: string })._ref ?? '')
      : ''
  const match = ref.match(/-(\d+)x(\d+)-/)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (!width || !height) return null
  return { width, height }
}

/** CDN crop box for schema ratios or Tailwind aspect classes used by SanityImage. */
export function sanityCropDimensionsForAspect(
  aspect: string | undefined,
): { width: number; height: number } | null {
  switch (aspect) {
    case '16:9':
    case 'aspect-video':
      return { width: 1200, height: 675 }
    case '4:3':
    case 'aspect-[4/3]':
      return { width: 1200, height: 900 }
    case '1:1':
    case 'aspect-square':
      return { width: 1200, height: 1200 }
    default:
      return null
  }
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
    /** Schema ratio (16:9) or Tailwind aspect class for CDN crop when fill + cover. */
    cropAspect?: string
  } = {},
): string {
  const {
    width,
    height,
    fill = false,
    objectFit = 'cover',
    quality = DEFAULT_SANITY_IMAGE_QUALITY,
    priority = false,
    cropAspect,
  } = options

  const defaultWidth = priority ? 1920 : 1200
  const defaultHeight = priority ? 1080 : 675
  const image = urlFor(source).auto('format').quality(quality)

  if (objectFit === 'cover') {
    const cropBox =
      width != null && height != null
        ? { width, height }
        : (sanityCropDimensionsForAspect(cropAspect) ??
          (!fill ? { width: defaultWidth, height: defaultHeight } : null))

    if (cropBox) {
      return image.width(cropBox.width).height(cropBox.height).fit('crop').url()
    }
  }

  // `contain` must not crop, even when width and height are set for the layout box.
  const explicitBox = width != null && height != null && objectFit !== 'contain'
  const fitMax = objectFit === 'contain' || fill || !explicitBox
  const url = explicitBox
    ? image.width(width).height(height).url()
    : fitMax
      ? image.width(width ?? defaultWidth).fit('max').url()
      : image.width(width ?? defaultWidth).height(height ?? defaultHeight).url()

  return url
}
