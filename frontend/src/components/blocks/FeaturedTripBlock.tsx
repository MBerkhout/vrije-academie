'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import {
  CONTAINER_CLASS,
  cleanBlockValue,
  getTitleTag,
  getTitleSizeClass,
  type FeaturedTripBlock as FeaturedTripBlockType,
  type FeaturedTripInfoCard,
  type Person,
} from '@/lib/cms'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const OVERLAY_CLASS = {
  none: '',
  light: 'bg-black/20',
  medium: 'bg-black/40',
  dark: 'bg-black/60',
} as const

/** Responsive hero crop: taller on small viewports, capped height on large. */
const HERO_WRAP_CLASS: Record<string, string> = {
  sm: 'min-h-[260px] h-[52vw] max-h-[400px] md:min-h-[300px] md:h-[42vw] md:max-h-[460px] lg:h-[min(40vw,520px)] lg:max-h-[560px]',
  md: 'min-h-[300px] h-[56vw] max-h-[460px] md:min-h-[340px] md:h-[46vw] md:max-h-[540px] lg:h-[min(46vw,620px)] lg:max-h-[640px]',
  lg: 'min-h-[340px] h-[60vw] max-h-[520px] md:min-h-[380px] md:h-[50vw] md:max-h-[600px] lg:h-[min(52vw,680px)] lg:max-h-[760px]',
  wide:
    'min-h-[240px] h-[44vw] max-h-[380px] md:min-h-[260px] md:h-[38vw] md:max-h-[440px] lg:h-[min(34vw,540px)] lg:max-h-[500px]',
}

function guidePhotoSource(person: Person) {
  if (!person.photo?.asset) return null
  return {
    asset: person.photo.asset,
    alt: `Foto van ${person.name}`,
  }
}

function TripInfoCard({ card }: { card: FeaturedTripInfoCard }) {
  const dates = card.travelDates?.filter((d) => d?.trim()) ?? []
  const price = card.price?.trim()
  const hasLeft = dates.length > 0 || !!price
  const guide = card.guide
  const guideSrc = guide ? guidePhotoSource(guide) : null
  const hasGuide = Boolean(guide && (guideSrc || guide.name?.trim()))

  return (
    <div
      className={cn(
        'bg-va-white border border-va-lightgray',
        'p-4 md:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}
    >
      <div className="flex gap-4 md:gap-6">
        {hasLeft && (
          <div className="min-w-0 flex-1 font-sans text-sm text-va-black">
            {dates.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-va-darkgray">Reisdata</p>
                <ul className="mt-2 space-y-1">
                  {dates.map((line, i) => (
                    <li key={i} className="leading-snug">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {price && (
              <p className={cn('mt-3 leading-snug', dates.length > 0 && 'pt-1')}>
                <span className="font-semibold">Reissom: </span>
                {price}
              </p>
            )}
          </div>
        )}
        {hasGuide && guide && (
          <div className="w-[4.5rem] shrink-0 text-center md:w-24">
            {guideSrc ? (
              <SanityImage
                source={guideSrc}
                width={192}
                height={192}
                className="aspect-square w-full object-cover grayscale"
              />
            ) : null}
            {guide.name?.trim() ? (
              <p
                className={cn(
                  'text-left text-xs leading-tight text-va-black md:text-center',
                  guideSrc && 'mt-2'
                )}
              >
                {guide.name}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export function FeaturedTripBlock({ block }: { block: FeaturedTripBlockType }) {
  const heroHeight = cleanBlockValue(block.heroHeight) ?? 'md'
  const showCard = block.showInfoCard !== false && block.infoCard
  const overlayKey = cleanBlockValue(block.overlayOpacity) ?? 'none'
  const overlay =
    overlayKey !== 'none' && OVERLAY_CLASS[overlayKey as keyof typeof OVERLAY_CLASS]
      ? OVERLAY_CLASS[overlayKey as keyof typeof OVERLAY_CLASS]
      : ''
  const TitleTag = getTitleTag(block.titleSize ?? 'h1')
  const heroWrap = HERO_WRAP_CLASS[heroHeight] ?? HERO_WRAP_CLASS.md
  const ctaOn =
    Boolean(cleanBlockValue(block.ctaEnabled)) &&
    Boolean(block.ctaLabel?.trim()) &&
    Boolean(block.ctaUrl)
  const hasArticle =
    Boolean(block.title) ||
    Boolean(block.subtitle?.trim()) ||
    Boolean(block.body && block.body.length > 0) ||
    ctaOn

  return (
    <BlockWrapper block={block}>
      <div className="w-full max-w-[1920px] mx-auto">
        <div className={cn('relative w-full overflow-hidden', heroWrap)}>
          {block.heroImage?.asset && (
            <>
              <div className="absolute inset-0">
                <SanityImage
                  source={block.heroImage}
                  fill
                  sizes="(max-width: 1920px) 100vw, 1920px"
                  aspectRatio=""
                  className="h-full w-full"
                />
              </div>
              {overlay ? (
                <div className={cn('pointer-events-none absolute inset-0 z-[1]', overlay)} aria-hidden />
              ) : null}
            </>
          )}

          {hasArticle ? (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/50 to-black/15"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 z-[3]">
                <div
                  className={cn(
                    CONTAINER_CLASS,
                    'pb-7 pt-20 sm:pb-8 sm:pt-24 md:pb-10 md:pt-28'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-3xl text-pretty [&_a]:relative [&_a]:z-10',
                      showCard && 'lg:max-w-[min(42rem,calc(100%-19rem))]'
                    )}
                  >
                  {block.title ? (
                    <TitleTag
                      className={cn(
                        getTitleSizeClass(block.titleSize),
                        'font-bold uppercase tracking-tight text-balance text-white drop-shadow-sm'
                      )}
                    >
                      {block.title}
                    </TitleTag>
                  ) : null}
                  {block.subtitle?.trim() ? (
                    <p className="mt-3 max-w-3xl text-lg text-white/90 md:text-xl">{block.subtitle}</p>
                  ) : null}
                  {block.body && block.body.length > 0 ? (
                    <div className="mt-5 max-w-3xl text-base leading-relaxed">
                      <PortableText value={block.body} tone="onDark" />
                    </div>
                  ) : null}
                  {ctaOn && block.ctaUrl && block.ctaLabel ? (
                    <Button
                      variant="primary"
                      size="md"
                      href={block.ctaUrl}
                      className="mt-6 self-start"
                    >
                      {block.ctaLabel.trim()}
                    </Button>
                  ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {showCard && block.infoCard ? (
            <div
              className={cn(
                CONTAINER_CLASS,
                'relative z-[4] mt-2 pb-1',
                'lg:absolute lg:bottom-10 xl:bottom-12 lg:right-6 xl:right-10 lg:mt-0 lg:mb-0 lg:translate-y-[32%]',
                'lg:w-[min(100%,22rem)] lg:max-w-[calc(100%-3rem)] lg:px-0 lg:mx-0'
              )}
            >
              <TripInfoCard card={block.infoCard} />
            </div>
          ) : null}
        </div>
      </div>
    </BlockWrapper>
  )
}
