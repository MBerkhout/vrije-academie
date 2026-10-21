'use client'

import { useEffect, useState } from 'react'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { SanityImage } from '@/components/cms/SanityImage'
import { cleanBlockValue, type VideoBlock as VideoBlockType } from '@/lib/cms'
import { sanityAssetDimensions } from '@/lib/cms/image-url'
import { cn } from '@/lib/utils'

const WIDTH_CLASS = {
  narrow: 'max-w-xl',
  normal: 'max-w-3xl',
  wide: 'max-w-full',
} as const

const ASPECT_CLASS = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
  free: '',
} as const

function posterUrlFromSource(
  posterImage: VideoBlockType['posterImage'],
): string | undefined {
  const asset = posterImage?.asset
  if (asset && typeof asset === 'object' && 'url' in asset && asset.url) {
    return String(asset.url)
  }
  return undefined
}

function videoUrlFromBlock(block: VideoBlockType): string | undefined {
  const asset = block.videoFile?.asset
  if (asset && typeof asset === 'object' && 'url' in asset && asset.url) {
    return String(asset.url)
  }
  return undefined
}

export function VideoBlock({ block }: { block: VideoBlockType }) {
  const contentWidth = cleanBlockValue(block.contentWidth) ?? 'normal'
  const aspectRatio = cleanBlockValue(block.aspectRatio) ?? '16:9'
  const widthClass =
    WIDTH_CLASS[contentWidth as keyof typeof WIDTH_CLASS] ?? WIDTH_CLASS.normal
  const aspectClass = ASPECT_CLASS[aspectRatio as keyof typeof ASPECT_CLASS] ?? ASPECT_CLASS['16:9']
  const videoSrc = videoUrlFromBlock(block)
  const posterUrl = posterUrlFromSource(block.posterImage)
  const caption = block.caption?.trim()
  const ariaLabel = caption || 'Video'

  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const freeDims = aspectClass ? null : sanityAssetDimensions(block.posterImage)
  const freeWidth = freeDims ? Math.min(freeDims.width, 1200) : undefined
  const freeHeight =
    freeDims && freeWidth ? Math.round((freeWidth * freeDims.height) / freeDims.width) : undefined

  const objectFit = aspectClass ? 'cover' : 'contain'

  if (!videoSrc && !posterUrl) {
    return null
  }

  const showVideo = videoSrc && !reduceMotion

  return (
    <BlockWrapper block={block}>
      <figure className={cn(widthClass, 'mx-auto')}>
        <div className={cn('overflow-hidden rounded', aspectClass && aspectClass)}>
          {showVideo ? (
            <video
              autoPlay
              muted
              playsInline
              loop
              poster={posterUrl}
              className={cn(
                aspectClass ? 'h-full w-full' : 'h-auto w-full',
                objectFit === 'cover' ? 'object-cover' : 'object-contain',
              )}
              aria-label={ariaLabel}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          ) : posterUrl || block.posterImage ? (
            <SanityImage
              source={block.posterImage ?? null}
              aspectRatio={
                (aspectClass || 'aspect-video') as
                  | 'aspect-video'
                  | 'aspect-square'
                  | 'aspect-[4/3]'
                  | ''
              }
              fill={!!aspectClass}
              objectFit={aspectClass ? 'cover' : 'contain'}
              width={freeWidth}
              height={freeHeight}
              className="h-auto w-full"
            />
          ) : (
            <video
              muted
              playsInline
              controls
              poster={posterUrl}
              className={cn(
                'h-full w-full',
                objectFit === 'cover' ? 'object-cover' : 'object-contain',
              )}
              aria-label={ariaLabel}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          )}
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-sm text-va-gray">{caption}</figcaption>
        )}
      </figure>
    </BlockWrapper>
  )
}
