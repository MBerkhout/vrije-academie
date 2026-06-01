'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { Button } from '@/components/ui'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type HeroBlock as HeroBlockType } from '@/lib/cms'
import { isExternalHref } from '@/lib/menu-href'
import { cn } from '@/lib/utils'

const OVERLAY_CLASS = {
  none: '',
  light: 'bg-black/20',
  medium: 'bg-black/40',
  dark: 'bg-black/60',
} as const

function SlideLinkShell({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
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
            'lg:col-span-2 relative overflow-hidden h-64 md:h-96',
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
                >
                  {slideBody}
                </SlideLinkShell>
              )
            }
            return <>{slideBody}</>
          })()}
          {slides.length > 1 && (
            <div className="pointer-events-auto absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    'w-2 h-2 rounded-full',
                    i === slideIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6 md:gap-8 lg:h-full lg:min-h-0">
          <div
            className={cn(
              'flex-1 min-h-0 overflow-hidden border border-va-lightgray-300 bg-white',
              'rounded-sm flex flex-col sm:flex-row sm:items-stretch'
            )}
          >
            <div
              className={cn(
                'min-w-0 flex flex-1 flex-col justify-center p-6 lg:p-8',
                block.topPanelImage?.asset && 'sm:max-w-[58%] lg:max-w-[60%]'
              )}
            >
              {block.topPanelTitle && (
                <Tag
                  className={cn(
                    getTitleSizeClass(block.topPanelTitleSize),
                    'font-sans font-bold text-va-black mb-3 text-balance'
                  )}
                >
                  {block.topPanelTitle}
                </Tag>
              )}
              {block.topPanelBody && block.topPanelBody.length > 0 && (
                <PortableText value={block.topPanelBody} />
              )}
              {block.topPanelCtaEnabled && block.topPanelCtaLabel && block.topPanelCtaUrl && (
                <Button variant="primary" href={block.topPanelCtaUrl} className="mt-4 self-start">
                  {block.topPanelCtaLabel}
                </Button>
              )}
            </div>
            {block.topPanelImage?.asset && (
              <div className="relative mr-1 h-full min-h-[10rem] w-full min-w-0 bg-white sm:flex-1 sm:max-w-[45%]">
                <SanityImage
                  source={block.topPanelImage}
                  fill
                  aspectRatio=""
                  objectFit="contain"
                  sizes="(min-width: 1024px) 320px, 100vw"
                  className="h-full w-full min-h-[10rem] sm:min-h-0"
                />
              </div>
            )}
          </div>
          <div className="shrink-0 rounded-sm border border-va-lightgray-300 bg-white p-6 lg:p-8">
            <h3
              className={cn(
                getTitleSizeClass('h3'),
                'font-sans font-bold text-va-black mb-2'
              )}
            >
              Meld je aan
            </h3>
            <p className="font-serif mb-4 text-va-darkgray">
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
