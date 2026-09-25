'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { SanityImage } from '@/components/cms/SanityImage'
import { cleanBlockValue, type HeroSlide } from '@/lib/cms'
import { isExternalHref } from '@/lib/menu-href'
import { trackSelectPromotion, trackViewPromotion } from '@/lib/analytics/events/ecommerce'
import { cn } from '@/lib/utils'

const OVERLAY_CLASS = {
  none: '',
  light: 'bg-black/20',
  medium: 'bg-black/40',
  dark: 'bg-black/60',
} as const

const slideArrowClass =
  'pointer-events-auto absolute bottom-4 z-20 flex items-center justify-center rounded-md p-2 md:p-3 text-va-yellow hover:bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-va-yellow min-w-[2.5rem] md:min-w-[3rem]'

const slideArrowIconClass = 'h-6 w-6 md:h-7 md:w-7 shrink-0'

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function SlideLinkShell({
  href,
  className,
  children,
  onNavigate,
}: {
  href: string
  className?: string
  children: ReactNode
  onNavigate?: () => void
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
        {children}
      </a>
    )
  }
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} className={className} onClick={onNavigate}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  )
}

export type ImageSlideStageProps = {
  slides: HeroSlide[]
  autoplay?: boolean
  autoplayInterval?: number
  /** Outer frame (height, width, radius). */
  className?: string
  imageSizes: string
  titleTag: 'h1' | 'h2'
  titleClassName?: string
  creativeSlotPrefix: string
  promotionFallbackName: string
  /** Server-rendered LCP image for slide 0 (hero only). */
  lcpImage?: ReactNode
  /** When true, first slide uses priority loading (hero only). */
  priorityFirstSlide?: boolean
}

export function ImageSlideStage({
  slides,
  autoplay,
  autoplayInterval,
  className,
  imageSizes,
  titleTag,
  titleClassName = 'text-3xl md:text-4xl font-sans font-bold',
  creativeSlotPrefix,
  promotionFallbackName,
  lcpImage,
  priorityFirstSlide = false,
}: ImageSlideStageProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = slides[slideIndex]
  const TitleTag = titleTag

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return
    const interval = (autoplayInterval ?? 5) * 1000
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), interval)
    return () => clearInterval(id)
  }, [autoplay, autoplayInterval, slides.length])

  useEffect(() => {
    if (!slide) return
    const promotionName = cleanBlockValue(slide.title)?.trim() || promotionFallbackName
    const promotionId =
      promotionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') ||
      `slide_${slideIndex + 1}`
    trackViewPromotion(promotionId, promotionName, `${creativeSlotPrefix}_${slideIndex + 1}`)
  }, [slide, slideIndex, creativeSlotPrefix, promotionFallbackName])

  function trackSlideSelect(index: number) {
    const target = slides[index]
    if (!target) return
    const promotionName = cleanBlockValue(target.title)?.trim() || promotionFallbackName
    const promotionId =
      promotionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `slide_${index + 1}`
    trackSelectPromotion(promotionId, promotionName, `${creativeSlotPrefix}_${index + 1}`)
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {slide?.backgroundImage &&
        (() => {
          const slideLink = cleanBlockValue(slide.url)?.trim()
          const slideSubtitle = cleanBlockValue(slide.subtitle)
          const slideBody = (
            <>
              <div className="absolute inset-0" aria-hidden>
                {slideIndex === 0 && lcpImage ? (
                  lcpImage
                ) : (
                  <SanityImage
                    source={slide.backgroundImage}
                    fill
                    sizes={imageSizes}
                    className="object-cover"
                    priority={priorityFirstSlide && slideIndex === 0}
                  />
                )}
              </div>
              {(() => {
                const overlay = cleanBlockValue(slide.overlayOpacity)
                return overlay && overlay !== 'none' ? (
                  <div className={cn('absolute inset-0', OVERLAY_CLASS[overlay])} aria-hidden />
                ) : null
              })()}
              <div
                className={cn(
                  'relative h-full flex flex-col justify-center p-8 text-white',
                  cleanBlockValue(slide.contentAlignment) === 'center'
                    ? 'items-center text-center'
                    : 'items-start'
                )}
              >
                <TitleTag className={titleClassName}>{slide.title}</TitleTag>
                {slideSubtitle?.trim() && (
                  <p className="mt-2 text-base md:text-lg opacity-90 font-sans">{slideSubtitle}</p>
                )}
              </div>
            </>
          )
          if (slideLink) {
            return (
              <SlideLinkShell
                href={slideLink}
                className="absolute inset-0 z-0 block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
                onNavigate={() => trackSlideSelect(slideIndex)}
              >
                {slideBody}
              </SlideLinkShell>
            )
          }
          return <>{slideBody}</>
        })()}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setSlideIndex((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            className={cn(slideArrowClass, 'left-2 md:left-4')}
          >
            <ChevronLeftIcon className={slideArrowIconClass} />
          </button>
          <button
            type="button"
            onClick={() => setSlideIndex((i) => (i + 1) % slides.length)}
            aria-label="Next slide"
            className={cn(slideArrowClass, 'right-2 md:right-4')}
          >
            <ChevronRightIcon className={slideArrowIconClass} />
          </button>
          <div className="pointer-events-auto absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  trackSlideSelect(i)
                  setSlideIndex(i)
                }}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === slideIndex}
                className={cn('w-2 h-2 rounded-full', i === slideIndex ? 'bg-white' : 'bg-white/50')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
