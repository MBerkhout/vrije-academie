'use client'

import { useState } from 'react'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { SanityImage } from '@/components/cms/SanityImage'
import { cleanBlockValue, type AfbeeldingBlock as AfbeeldingBlockType } from '@/lib/cms'
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

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/)([\w-]+)/)
  return match ? match[1] : null
}

function YouTubeWithPlaceholder({
  youtubeUrl,
  placeholderImage,
  aspectClass,
}: {
  youtubeUrl: string
  placeholderImage?: { asset: { _ref: string }; alt?: string } | null
  aspectClass: string
}) {
  const [playing, setPlaying] = useState(false)
  const videoId = extractYoutubeId(youtubeUrl) ?? ''
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`

  if (playing) {
    return (
      <iframe
        src={embedUrl}
        title="YouTube video"
        className="w-full h-full"
        allowFullScreen
      />
    )
  }

  if (placeholderImage) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="relative w-full h-full block focus:outline-none focus:ring-2 focus:ring-va-yellow focus:ring-offset-2"
        aria-label="Play video"
      >
        <SanityImage
          source={placeholderImage}
          fill
          aspectRatio={
            (aspectClass === 'aspect-video'
              ? 'aspect-video'
              : aspectClass === 'aspect-square'
                ? 'aspect-square'
                : aspectClass === 'aspect-[4/3]'
                  ? 'aspect-[4/3]'
                  : 'aspect-video') as 'aspect-video' | 'aspect-square' | 'aspect-[4/3]' | ''
          }
          className="object-cover"
        />
        <span
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          aria-hidden
        >
          <span className="w-16 h-16 rounded-full bg-va-yellow flex items-center justify-center text-va-black shadow-lg">
            <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>
    )
  }

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
      title="YouTube video"
      className="w-full h-full"
      allowFullScreen
    />
  )
}

export function AfbeeldingBlock({ block }: { block: AfbeeldingBlockType }) {
  const mediaType = cleanBlockValue(block.mediaType) ?? 'image'
  const contentWidth = cleanBlockValue(block.contentWidth) ?? 'normal'
  const aspectRatio = cleanBlockValue(block.aspectRatio) ?? '16:9'
  const widthClass =
    WIDTH_CLASS[contentWidth as keyof typeof WIDTH_CLASS] ?? WIDTH_CLASS.normal
  const aspectClass = ASPECT_CLASS[aspectRatio]

  return (
    <BlockWrapper block={block}>
      <figure className={cn(widthClass, 'mx-auto')}>
        {mediaType === 'youtube' && block.youtubeUrl ? (
          <div className={cn('overflow-hidden rounded', aspectClass || 'aspect-video')}>
            <YouTubeWithPlaceholder
              youtubeUrl={block.youtubeUrl}
              placeholderImage={block.placeholderImage}
              aspectClass={aspectClass || 'aspect-video'}
            />
          </div>
        ) : mediaType === 'image' && block.image ? (
          <div className={cn('overflow-hidden rounded', aspectClass && aspectClass)}>
            <SanityImage
              source={block.image}
              aspectRatio={aspectClass as 'aspect-video' | 'aspect-square' | 'aspect-[4/3]' | ''}
              fill={!!aspectClass}
              className="w-full"
            />
          </div>
        ) : null}
        {block.caption && (
          <figcaption className="mt-2 text-sm text-va-gray text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
    </BlockWrapper>
  )
}
