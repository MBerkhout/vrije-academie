import Image from 'next/image'
import { sanityImageSrc, DEFAULT_SANITY_IMAGE_QUALITY } from '@/lib/cms/image-url'
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
  /** Next.js + Sanity CDN quality (1–100). Default 80. */
  quality?: number
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
  quality = DEFAULT_SANITY_IMAGE_QUALITY,
}: SanityImageProps) {
  if (!source?.asset) return null

  const src = sanityImageSrc(source, {
    width,
    height,
    fill,
    objectFit,
    quality,
    priority,
  })
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
          quality={quality}
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
      width={width ?? (priority ? 1920 : 1200)}
      height={height ?? (priority ? 1080 : 675)}
      className={cn(aspectRatio, objectClass, 'object-center', className)}
      sizes={sizes !== '100vw' ? sizes : undefined}
      quality={quality}
      {...loadingProps}
    />
  )
}
