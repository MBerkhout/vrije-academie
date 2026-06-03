'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { Button } from '@/components/ui'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type ColumnsBlock as ColumnsBlockType, type ColumnItem } from '@/lib/cms'
import {
  classNameForProductBadge,
  DEFAULT_PRODUCT_BADGE_CLASS,
} from '@/lib/event-status-presentation'
import { plpProductPath } from '@/lib/routes'
import { cn } from '@/lib/utils'

const GAP_CLASS = { sm: 'gap-4', md: 'gap-8', lg: 'gap-16' } as const
const OVERLAY_CLASS = { none: '', light: 'bg-black/20', medium: 'bg-black/40', dark: 'bg-black/60' } as const

const TITLE_ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

/** Relative flex growth at md+ (basis-0 so widths follow ratio). */
const COLUMN_WIDTH_CLASS = {
  equal: 'md:flex-1 md:basis-0',
  narrow: 'md:flex-[0.78] md:basis-0',
  wide: 'md:flex-[1.28] md:basis-0',
} as const

const COLUMN_VALIGN_CLASS = {
  top: 'justify-start',
  center: 'justify-center',
  bottom: 'justify-end',
} as const

function ColumnMedia({ col }: { col: ColumnItem }) {
  if (col.columnType !== 'media') return null
  if (col.mediaType === 'youtube' && col.mediaYoutubeUrl) {
    const match = col.mediaYoutubeUrl.match(/(?:watch\?v=|youtu\.be\/|embed\/)([\w-]+)/)
    const id = match ? match[1] : ''
    return (
      <div className="aspect-video overflow-hidden rounded">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="YouTube"
          className="w-full h-full"
          allowFullScreen
        />
      </div>
    )
  }
  if (col.mediaImage) {
    return (
      <figure>
        <div className="aspect-video overflow-hidden rounded">
          <SanityImage
            source={{ ...col.mediaImage, alt: col.mediaImageAlt ?? col.mediaImage?.alt }}
            fill
            aspectRatio="aspect-video"
          />
        </div>
        {col.mediaCaption && (
          <figcaption className="mt-2 text-sm text-va-gray">{col.mediaCaption}</figcaption>
        )}
      </figure>
    )
  }
  return null
}

function ColumnHighlight({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  if (columnType !== 'highlightCard' || !col.highlightImage || !col.highlightTitle) return null
  const Tag = getTitleTag(col.highlightTitleSize)
  return (
    <div className="rounded overflow-hidden border border-va-lightgray">
      <div className="aspect-video relative">
        <SanityImage source={col.highlightImage} fill aspectRatio="aspect-video" />
      </div>
      <div className="p-4">
        {col.highlightLabel && (
          <span className="inline-block px-2 py-0.5 text-xs bg-va-yellow rounded mb-2">
            {col.highlightLabel}
          </span>
        )}
        <Tag className={cn(getTitleSizeClass(col.highlightTitleSize), 'font-bold text-va-black')}>{col.highlightTitle}</Tag>
        {col.highlightTeaser && col.highlightTeaser.length > 0 && (
          <div className="mt-2">
            <PortableText value={col.highlightTeaser} />
          </div>
        )}
      </div>
    </div>
  )
}

function ColumnCta({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  const ctaCardOverlay = cleanBlockValue(col.ctaCardOverlay)
  if (columnType !== 'ctaCard' || !col.ctaCardBgImage || !col.ctaCardTitle) return null
  const Tag = getTitleTag(col.ctaCardTitleSize)
  const overlay =
    ctaCardOverlay && ctaCardOverlay !== 'none'
      ? (OVERLAY_CLASS[ctaCardOverlay as keyof typeof OVERLAY_CLASS] ?? 'bg-black/40')
      : 'bg-black/40'
  return (
    <div className="relative rounded overflow-hidden min-h-[200px]">
      <div className="absolute inset-0">
        <SanityImage source={col.ctaCardBgImage} fill className="object-cover" />
      </div>
      <div className={cn('absolute inset-0', overlay)} />
      <div className="relative p-6 flex flex-col justify-end text-white">
        <Tag className={cn(getTitleSizeClass(col.ctaCardTitleSize), 'font-bold')}>{col.ctaCardTitle}</Tag>
        {col.ctaCardBody && col.ctaCardBody.length > 0 && (
          <div className="mt-2 opacity-90">
            <PortableText value={col.ctaCardBody} />
          </div>
        )}
        {col.ctaCardCtaEnabled && col.ctaCardCtaLabel && col.ctaCardCtaUrl && (
          <Button variant="primary" href={col.ctaCardCtaUrl} className="mt-4">
            {col.ctaCardCtaLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function ColumnPerson({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  if (columnType !== 'personCard' || !col.person) return null
  const person = typeof col.person === 'object' && col.person !== null ? col.person : null
  if (!person) return null
  const name = (person as { name?: string }).name ?? ''
  const role = (person as { role?: string }).role
  const photo = (person as { photo?: { asset?: unknown } }).photo
  const bio = (person as { bio?: string }).bio
  const profileUrl = (person as { profileUrl?: string }).profileUrl
  return (
    <div className="border border-va-lightgray rounded p-4">
      {photo ? (
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
          <SanityImage source={photo} width={80} height={80} aspectRatio="aspect-square" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-full bg-va-lightgray flex items-center justify-center mb-3" aria-hidden />
      )}
      <h3 className={cn(getTitleSizeClass('h3'), 'font-semibold text-va-black')}>{name}</h3>
      {role && <p className="text-sm text-va-gray">{role}</p>}
      {col.personShowBio !== false && bio && <p className="text-sm text-va-darkgray mt-2">{bio}</p>}
      {col.personShowLink !== false && profileUrl && (
        <Link href={profileUrl} className="text-va-orange underline text-sm mt-1 inline-block">
          Profiel
        </Link>
      )}
    </div>
  )
}

function productCardCtaLabel(col: ColumnItem, product: { badge?: string | null }): string | null {
  const custom = col.productCardsItemCtaLabel?.trim()
  if (custom) return custom
  const badge = product.badge?.trim()
  if (badge) return badge
  return null
}

function ColumnProductCards({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  if (columnType !== 'productCards') return null
  const TitleTag = getTitleTag('h2')
  const items = col.productCardsManualItems ?? []
  if (items.length === 0) {
    return (
      <div className="rounded border border-va-lightgray py-8 text-center text-va-gray">
        Geen items gevonden.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {col.productCardsTitle && (
        <TitleTag className={cn(getTitleSizeClass('h2'), 'font-bold text-va-black')}>
          {col.productCardsTitle}
        </TitleTag>
      )}
      <ul className="grid list-none grid-cols-1 gap-3 p-0 m-0">
        {items.map((item) => {
          const product = typeof item === 'object' && item !== null ? item : null
          if (!product) return null
          const title = product.title?.trim()
          const handle = product.handle?.trim()
          const href = handle ? plpProductPath(handle) : '#'
          const thumbnailUrl = product.thumbnailUrl?.trim()
          const ctaLabel = productCardCtaLabel(col, product)
          const ctaClass = ctaLabel
            ? (() => {
                const derived = classNameForProductBadge(ctaLabel)
                return derived === DEFAULT_PRODUCT_BADGE_CLASS
                  ? 'bg-white text-va-black'
                  : derived
              })()
            : null
          return (
            <li key={product._id ?? title}>
              <Link
                href={href}
                className={cn(
                  'group flex overflow-hidden rounded-sm border border-va-lightgray bg-white shadow-sm',
                  'transition-[box-shadow,border-color] hover:border-va-black/25 hover:shadow-md',
                  'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2',
                )}
              >
                <div className="relative h-[88px] w-[88px] shrink-0 bg-va-lightgray">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      sizes="88px"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  {title ? (
                    <p className="flex flex-1 items-start px-3 py-2.5 font-sans text-sm font-semibold leading-snug text-va-black group-hover:text-va-orange">
                      {title}
                    </p>
                  ) : null}
                  {ctaLabel ? (
                    <span
                      className={cn(
                        'flex items-center justify-between gap-1 border-t border-va-lightgray px-3 py-1.5',
                        'font-sans text-[10px] font-bold uppercase tracking-wide',
                        ctaClass ?? 'bg-white text-va-black',
                      )}
                    >
                      <span>{ctaLabel}</span>
                      <span aria-hidden className="text-sm leading-none">
                        ›
                      </span>
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {col.productCardsFooterCtaEnabled && col.productCardsFooterCtaLabel && col.productCardsFooterCtaUrl && (
        <Link
          href={col.productCardsFooterCtaUrl}
          className={cn(
            'inline-block font-sans text-sm font-bold uppercase tracking-wide text-va-black',
            'underline decoration-va-black decoration-1 underline-offset-[5px]',
            'hover:text-va-orange hover:decoration-va-yellow',
            'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2',
          )}
        >
          {col.productCardsFooterCtaLabel}
          {' ›'}
        </Link>
      )}
    </div>
  )
}

/** With one column, flex-based width classes are skipped (parent stays column flex). Narrow then caps readable width. */
function withSingleColumnNarrowLayout(
  col: ColumnItem,
  singleColumn: boolean,
  node: ReactNode,
): ReactNode {
  if (!singleColumn || cleanBlockValue(col.width) !== 'narrow') return node
  return <div className="max-w-xl w-full mx-auto">{node}</div>
}

function RenderColumn({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  if (columnType === 'text') {
    const Tag = getTitleTag(col.textTitleSize)
    return (
      <div>
        {col.textTitle && (
          <Tag
            className={cn(
              getTitleSizeClass(col.textTitleSize),
              'font-bold text-va-black mb-4',
            )}
          >
            {col.textTitle}
          </Tag>
        )}
        {col.textContent && col.textContent.length > 0 && <PortableText value={col.textContent} />}
      </div>
    )
  }
  if (columnType === 'media') return <ColumnMedia col={col} />
  if (columnType === 'highlightCard') return <ColumnHighlight col={col} />
  if (columnType === 'ctaCard') return <ColumnCta col={col} />
  if (columnType === 'personCard') return <ColumnPerson col={col} />
  if (columnType === 'productCards') return <ColumnProductCards col={col} />
  return null
}

export function ColumnsBlock({ block }: { block: ColumnsBlockType }) {
  const allColumns = block.columns ?? []
  const num = block.numberOfColumns ?? 3
  const columns = allColumns.slice(0, Math.max(1, Math.min(4, num)))
  const gapClass = GAP_CLASS[cleanBlockValue(block.columnGap) ?? 'md']
  const Tag = getTitleTag(block.sectionTitleSize)
  const titleAlign = TITLE_ALIGN_CLASS[cleanBlockValue(block.sectionTitleAlignment) ?? 'left']
  const multi = columns.length > 1
  const singleColumn = columns.length === 1

  return (
    <BlockWrapper block={block}>
      <div className="space-y-6 font-sans">
        {block.sectionTitle && (
          <Tag
            className={cn(
              getTitleSizeClass(block.sectionTitleSize),
              'font-bold text-va-black mb-4',
              titleAlign,
            )}
          >
            {block.sectionTitle}
          </Tag>
        )}
        {block.introText && block.introText.length > 0 && (
          <PortableText value={block.introText} />
        )}
        <div
          className={cn(
            'flex w-full flex-col',
            gapClass,
            multi && 'md:flex-row md:items-stretch',
          )}
        >
          {columns.map((col, i) => {
            const widthKey = (cleanBlockValue(col.width) ?? 'equal') as keyof typeof COLUMN_WIDTH_CLASS
            const widthClass = COLUMN_WIDTH_CLASS[widthKey] ?? COLUMN_WIDTH_CLASS.equal
            const valignKey = (cleanBlockValue(col.verticalAlignment) ?? 'top') as keyof typeof COLUMN_VALIGN_CLASS
            const valignClass = COLUMN_VALIGN_CLASS[valignKey] ?? COLUMN_VALIGN_CLASS.top
            return (
              <div
                key={i}
                className={cn(
                  'flex min-h-0 min-w-0 flex-col',
                  multi && widthClass,
                  multi && valignClass,
                  multi && 'md:min-h-[1px]',
                )}
              >
                {withSingleColumnNarrowLayout(col, singleColumn, <RenderColumn col={col} />)}
              </div>
            )
          })}
        </div>
      </div>
    </BlockWrapper>
  )
}
