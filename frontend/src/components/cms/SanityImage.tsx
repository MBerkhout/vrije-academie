'use client'

import Image from 'next/image'
import { urlFor } from '@/lib/cms'
import { cn } from '@/lib/utils'

interface SanityImageProps {
  source: { asset?: { _ref?: string; url?: string } | unknown; alt?: string } | null
  width?: number
  height?: number
  className?: string
  aspectRatio?: 'aspect-video' | 'aspect-square' | 'aspect-[4/3]' | ''
  /** `cover` crops to fill (default). `contain` fits the whole image inside the box without zoom/crop. */
  objectFit?: 'cover' | 'contain'
  fill?: boolean
  sizes?: string
}

export function SanityImage({
  source,
  width,
  height,
  className,
  aspectRatio = 'aspect-video',
  objectFit = 'cover',
  fill,
  sizes = '100vw',
}: SanityImageProps) {
  if (!source?.asset) return null

  /**
   * Default urlFor uses width+height, which makes Sanity's CDN *crop* to that box.
   * For `contain` we need the full uncropped asset (only downscaled for performance).
   */
  const src =
    objectFit === 'contain'
      ? urlFor(source).maxWidth(width ?? 1920).auto('format').url()
      : urlFor(source).width(width ?? 1200).height(height ?? 675).url()
  const alt = source.alt ?? ''
  const objectClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'

  if (fill) {
    return (
      <div
        className={cn(
          'relative',
          /* overflow-hidden + cover can clip; with contain, avoid clipping the letterboxed image */
          objectFit === 'contain' ? 'overflow-visible' : 'overflow-hidden',
          aspectRatio,
          className
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className={cn(objectClass, 'object-center')}
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 675}
      className={cn(aspectRatio, objectClass, 'object-center', className)}
      loading="lazy"
    />
  )
}
