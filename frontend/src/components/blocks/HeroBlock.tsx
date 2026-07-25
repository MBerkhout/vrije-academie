'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { Button } from '@/components/ui'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type HeroBlock as HeroBlockType } from '@/lib/cms'
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

export function HeroBlock({ block }: { block: HeroBlockType }) {
  const slides = block.slides ?? []
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = slides[slideIndex]

  useEffect(() => {
    if (!block.autoplay || slides.length <= 1) return
    const interval = (block.autoplayInterval ?? 5) * 1000
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), interval)
    return () => clearInterval(id)
  }, [block.autoplay, block.autoplayInterval, slides.length])

  useEffect(() => {
    if (!slide) return
    const promotionName = cleanBlockValue(slide.title)?.trim() || 'Homepage banner'
    const promotionId = promotionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `slide_${slideIndex + 1}`
    trackViewPromotion(promotionId, promotionName, `homepage_jumbotron_${slideIndex + 1}`)
  }, [slide, slideIndex])

  function trackSlideSelect(index: number) {
    const target = slides[index]
    if (!target) return
    const promotionName = cleanBlockValue(target.title)?.trim() || 'Homepage banner'
    const promotionId = promotionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `slide_${index + 1}`
    trackSelectPromotion(promotionId, promotionName, `homepage_jumbotron_${index + 1}`)
  }

  const Tag = getTitleTag(block.topPanelTitleSize ?? 'h2')
  const fullBleed = cleanBlockValue(block.width) === 'full'
  const newsletterSignupUrl = cleanBlockValue(block.newsletterSignupUrl)?.trim()

  return (
    <BlockWrapper block={block}>
      <div
        className={cn(
          'grid lg:grid-cols-3 gap-6 md:gap-8 lg:items-stretch',
          fullBleed && 'px-4 sm:px-6 lg:px-8'
        )}
      >
        <div
          className={cn(
            'lg:col-span-2 relative overflow-hidden rounded-lg h-64 md:h-96',
            'lg:h-full lg:min-h-0'
          )}
        >
          {slide?.backgroundImage && (() => {
            const slideLink = cleanBlockValue(slide.url)?.trim()
            const slideSubtitle = cleanBlockValue(slide.subtitle)
            const slideBody = (
              <>
                <div className="absolute inset-0" aria-hidden>
                  <SanityImage
                    source={slide.backgroundImage}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
                {(() => {
                  const overlay = cleanBlockValue(slide.overlayOpacity)
                  return overlay && overlay !== 'none' ? (
                    <div
                      className={cn('absolute inset-0', OVERLAY_CLASS[overlay])}
                      aria-hidden
                    />
                  ) : null
                })()}
                <div
                  className={cn(
                    'relative h-full flex flex-col justify-center p-8 text-white',
                    cleanBlockValue(slide.contentAlignment) === 'center' ? 'items-center text-center' : 'items-start'
                  )}
                >
                  <h1 className="text-3xl md:text-4xl font-sans font-bold">
                    {slide.title}
                  </h1>
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
                    className={cn(
                      'w-2 h-2 rounded-full',
                      i === slideIndex ? 'bg-white' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-6 md:gap-8 lg:h-full lg:min-h-0">
          <div
            className={cn(
              'flex-1 min-h-0 overflow-hidden border border-va-lightgray-300 bg-white',
              'rounded-lg flex flex-row items-stretch'
            )}
          >
            <div
              className={cn(
                'min-w-0 flex flex-1 flex-col justify-center p-4 sm:p-6 lg:p-8',
                block.topPanelImage?.asset && 'max-w-[58%] lg:max-w-[60%]'
              )}
            >
              {block.topPanelTitle && (
                <Tag
                  className={cn(
                    getTitleSizeClass(block.topPanelTitleSize),
                    'font-sans font-bold text-va-black mb-2 sm:mb-3 text-balance'
                  )}
                >
                  {block.topPanelTitle}
                </Tag>
              )}
              {block.topPanelBody && block.topPanelBody.length > 0 && (
                <PortableText value={block.topPanelBody} />
              )}
              {block.topPanelCtaEnabled && block.topPanelCtaLabel && block.topPanelCtaUrl && (
                <Button variant="primary" href={block.topPanelCtaUrl} className="mt-3 sm:mt-4 self-start">
                  {block.topPanelCtaLabel}
                </Button>
              )}
            </div>
            {block.topPanelImage?.asset && (
              <div className="relative mr-1 min-h-[5rem] w-[42%] shrink-0 min-w-0 self-stretch bg-white sm:flex-1 sm:max-w-[45%]">
                <SanityImage
                  source={block.topPanelImage}
                  fill
                  aspectRatio=""
                  objectFit="contain"
                  sizes="(min-width: 640px) 45vw, 42vw"
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
          <div className="shrink-0 rounded-lg border border-va-lightgray-300 bg-white p-6 lg:p-8">
            <h3
              className={cn(
                getTitleSizeClass('h3'),
                'font-sans font-bold text-va-black mb-2'
              )}
            >
              Meld je aan
            </h3>
            <p className="font-sans mb-4 text-va-darkgray">
              Schrijf je hier in voor onze nieuwsbrief!
            </p>
            {newsletterSignupUrl ? (
              <Button variant="primary" href={newsletterSignupUrl}>
                Aanmelden
              </Button>
            ) : (
              <Button type="button" variant="primary" disabled>
                Aanmelden
              </Button>
            )}
          </div>
        </div>
      </div>
    </BlockWrapper>
  )
}
