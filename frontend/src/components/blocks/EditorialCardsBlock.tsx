'use client'

import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import {
  cleanBlockValue,
  CONTAINER_CLASS,
  getTitleTag,
  getTitleSizeClass,
  type EditorialCardItem,
  type EditorialCardsBlock as EcBlock,
} from '@/lib/cms'
import { cn } from '@/lib/utils'

const OVERLAY_CLASS = {
  none: '',
  light: 'bg-black/20',
  medium: 'bg-black/40',
  dark: 'bg-black/60',
} as const

/** Matches Categories block CTA / ghost link; `group-hover:*` so it reacts when the whole card is a link. */
const EDITORIAL_CARD_CTA_CLASS = cn(
  'mt-auto inline-flex h-auto w-full items-center justify-start rounded-none px-0 py-0 text-left',
  'font-sans text-sm font-bold uppercase tracking-wide',
  'bg-transparent text-va-black underline decoration-va-black decoration-1 underline-offset-[5px]',
  'transition-colors active:text-va-black',
  'group-hover:bg-transparent group-hover:text-va-orange group-hover:underline group-hover:decoration-va-yellow',
  'active:bg-transparent lg:w-auto'
)

function linkIsExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith('//')
}

/** Same column count at all breakpoints (2–4 cards side by side, including mobile). */
function editorialGridClass(cardCount: number) {
  if (cardCount <= 1) {
    return 'grid-cols-1 md:max-w-4xl'
  }
  if (cardCount === 2) {
    return 'grid-cols-2'
  }
  if (cardCount === 3) {
    return 'grid-cols-3'
  }
  return 'grid-cols-4'
}

function cardImageSizes(cardCount: number) {
  if (cardCount <= 1) return '(min-width: 768px) 80vw, 100vw'
  if (cardCount === 2) return '(min-width: 768px) 45vw, 50vw'
  if (cardCount === 3) return '(min-width: 768px) 34vw, 33vw'
  return '(min-width: 1024px) 24vw, 25vw'
}

function EditorialCard({ card, cardCount }: { card: EditorialCardItem; cardCount: number }) {
  const url = card.linkUrl?.trim()
  const linkLabel = card.linkLabel?.trim()
  const title = card.title?.trim()

  const body = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-va-lightgray">
        {card.image?.asset ? (
          <SanityImage
            source={card.image}
            fill
            aspectRatio=""
            className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
            sizes={cardImageSizes(cardCount)}
          />
        ) : null}
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col gap-2 px-3 pb-3 pt-3 sm:gap-3 sm:px-6 sm:pb-6 sm:pt-5',
          cardCount >= 2 && 'md:gap-3'
        )}
      >
        {card.label?.trim() ? (
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-va-gray sm:text-xs">
            {card.label.trim()}
          </p>
        ) : null}
        {title ? (
          <h3
            className={cn(
              'font-sans font-bold leading-snug text-va-black',
              cardCount >= 2 ? 'text-sm sm:text-xl' : 'text-lg sm:text-xl'
            )}
          >
            {title}
          </h3>
        ) : null}
        {card.description && card.description.length > 0 ? (
          <div
            className={cn(
              'font-sans leading-relaxed text-va-darkgray',
              cardCount >= 2 ? 'hidden text-xs sm:block sm:text-sm' : 'text-sm',
              '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_li]:text-sm'
            )}
          >
            <PortableText value={card.description} />
          </div>
        ) : null}
        {url && linkLabel ? (
          <span className={EDITORIAL_CARD_CTA_CLASS}>
            {linkLabel}
            {' >'}
          </span>
        ) : null}
      </div>
    </>
  )

  const cardClass = cn(
    'group flex min-h-0 flex-col overflow-hidden rounded-lg bg-va-white',
    'shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-[box-shadow,color] duration-300',
    'hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)]',
    'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2'
  )

  if (url) {
    if (linkIsExternal(url)) {
      return (
        <a href={url} className={cn(cardClass, 'block')} rel="noopener noreferrer" target="_blank">
          {body}
        </a>
      )
    }
    return (
      <Link href={url} className={cn(cardClass, 'block')}>
        {body}
      </Link>
    )
  }

  return <div className={cardClass}>{body}</div>
}

function editorialSectionTitleSize(block: EcBlock): {
  Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'p'
  sizeClass: string
} {
  const raw = cleanBlockValue(block.titleSize)
  if (raw === 'none') {
    return { Tag: 'p', sizeClass: 'text-lg' }
  }
  if (raw === 'h1' || raw === 'h2' || raw === 'h3' || raw === 'h4') {
    return { Tag: getTitleTag(raw), sizeClass: getTitleSizeClass(raw) }
  }
  // Legacy: documents zonder titelgrootte (voorheen impliciet H2)
  return { Tag: getTitleTag('h2'), sizeClass: getTitleSizeClass('h2') }
}

export function EditorialCardsBlock({ block }: { block: EcBlock }) {
  const cards = block.cards ?? []
  const { Tag, sizeClass } = editorialSectionTitleSize(block)
  const overlayKey = cleanBlockValue(block.overlayOpacity) ?? 'none'
  const overlay =
    overlayKey !== 'none' && OVERLAY_CLASS[overlayKey as keyof typeof OVERLAY_CLASS]
      ? OVERLAY_CLASS[overlayKey as keyof typeof OVERLAY_CLASS]
      : ''

  return (
    <BlockWrapper block={block}>
      <div className="relative w-full overflow-hidden">
        {block.backgroundImage?.asset ? (
          <>
            <div className="absolute inset-0">
              <SanityImage
                source={block.backgroundImage}
                fill
                aspectRatio=""
                className="h-full min-h-[280px] w-full object-cover"
                sizes="100vw"
              />
            </div>
            {overlay ? (
              <div className={cn('pointer-events-none absolute inset-0 z-[1]', overlay)} aria-hidden />
            ) : null}
          </>
        ) : null}

        <div
          className={cn(
            'relative z-[2] min-h-[280px]',
            CONTAINER_CLASS,
            'py-10 md:py-14 lg:py-16'
          )}
        >
          {block.title ? (
            <Tag
              className={cn(
                sizeClass,
                'inline-block border-b border-va-black pb-1 font-sans font-bold text-va-black',
                'drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]'
              )}
            >
              {block.title}
            </Tag>
          ) : null}

          <div
            className={cn(
              'mt-8 grid gap-3 sm:gap-6 md:gap-8',
              editorialGridClass(cards.length)
            )}
          >
            {cards.map((card, i) => (
              <EditorialCard key={i} card={card} cardCount={cards.length} />
            ))}
          </div>
        </div>
      </div>
    </BlockWrapper>
  )
}
