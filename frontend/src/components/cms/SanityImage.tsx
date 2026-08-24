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
  /** LCP candidate: eager load with high fetch priority and Next.js preload. */
  priority?: boolean
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
  priority = false,
}: SanityImageProps) {
  if (!source?.asset) return null

  const defaultWidth = priority ? 1920 : 1200
  const defaultHeight = priority ? 1080 : 675

  /**
   * Default urlFor uses width+height, which makes Sanity's CDN *crop* to that box.
   * For `contain` we need the full uncropped asset (only downscaled for performance).
   */
  const src =
    objectFit === 'contain'
      ? urlFor(source).maxWidth(width ?? defaultWidth).auto('format').url()
      : urlFor(source).width(width ?? defaultWidth).height(height ?? defaultHeight).url()
  const alt = source.alt ?? ''
  const objectClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'

  const loadingProps = priority
    ? { priority: true as const, fetchPriority: 'high' as const }
    : { loading: 'lazy' as const }

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
          {...loadingProps}
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? defaultWidth}
      height={height ?? defaultHeight}
      className={cn(aspectRatio, objectClass, 'object-center', className)}
      sizes={sizes !== '100vw' ? sizes : undefined}
      {...loadingProps}
    />
  )
}
