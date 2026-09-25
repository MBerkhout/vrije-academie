'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { Button } from '@/components/ui'
import { ImageSlideStage } from '@/components/blocks/ImageSlideStage'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type HeroBlock as HeroBlockType } from '@/lib/cms'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const HERO_SLIDE_SIZES = '(max-width: 1024px) 100vw, 66vw'

export function HeroBlock({
  block,
  lcpImage,
}: {
  block: HeroBlockType
  /** Server-rendered LCP image for slide 0 (from BlockRenderer). */
  lcpImage?: ReactNode
}) {
  const slides = block.slides ?? []
  const Tag = getTitleTag(block.topPanelTitleSize ?? 'h2')
  const fullBleed = cleanBlockValue(block.width) === 'full'
  const showNewsletter = block.newsletterEnabled !== false
  const newsletterSignupUrl = cleanBlockValue(block.newsletterSignupUrl)?.trim()

  return (
    <BlockWrapper block={block}>
      <div
        className={cn(
          'grid lg:grid-cols-3 gap-6 md:gap-8 lg:items-stretch',
          fullBleed && 'px-4 sm:px-6 lg:px-8'
        )}
      >
        <ImageSlideStage
          slides={slides}
          autoplay={block.autoplay}
          autoplayInterval={block.autoplayInterval}
          className="lg:col-span-2 relative overflow-hidden rounded-lg h-64 md:h-96 lg:h-full lg:min-h-0"
          imageSizes={HERO_SLIDE_SIZES}
          titleTag="h1"
          creativeSlotPrefix="homepage_jumbotron"
          promotionFallbackName="Homepage banner"
          lcpImage={lcpImage}
          priorityFirstSlide
        />
        <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
          <div
            className={cn(
              'flex-1 min-h-0 overflow-hidden border border-va-lightgray-300 bg-white',
              'rounded-lg flex flex-row items-stretch'
            )}
          >
            <div
              className={cn(
                'min-w-0 flex flex-1 flex-col justify-center p-4 pr-2 sm:p-6 sm:pr-2 lg:p-6 lg:pr-2',
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
                <Button variant="primary" href={block.topPanelCtaUrl} className="mt-0 self-start">
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
          {showNewsletter && (
            <div className="shrink-0 rounded-lg border border-va-lightgray-300 bg-white p-6 lg:p-8">
              <h3
                className={cn(getTitleSizeClass('h3'), 'font-sans font-bold text-va-black mb-2')}
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
          )}
        </div>
      </div>
    </BlockWrapper>
  )
}
