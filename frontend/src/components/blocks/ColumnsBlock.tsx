'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { Button } from '@/components/ui'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { getTitleTag, getTitleSizeClass, cleanBlockValue, type ColumnsBlock as ColumnsBlockType, type ColumnItem } from '@/lib/cms'
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

function ColumnProductCards({ col }: { col: ColumnItem }) {
  const columnType = cleanBlockValue(col.columnType)
  if (columnType !== 'productCards') return null
  const items = col.productCardsManualItems ?? []
  if (items.length === 0) {
    return (
      <div className="text-va-gray text-center py-8 border border-va-lightgray rounded">
        Geen items gevonden.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {col.productCardsTitle && (
        <h3 className={cn(getTitleSizeClass('h3'), 'font-semibold text-va-black')}>{col.productCardsTitle}</h3>
      )}
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => {
          const product = typeof item === 'object' && item !== null ? item : null
          if (!product) return null
          const title = (product as { title?: string }).title
          const image = (product as { image?: { asset?: unknown } }).image
          const linkUrl = (product as { linkUrl?: string }).linkUrl
          return (
            <Link
              key={(product as { _id?: string })._id}
              href={linkUrl ?? '#'}
              className="flex gap-3 border border-va-lightgray rounded p-3 hover:border-va-black"
            >
              {image && (
                <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                  <SanityImage source={image} width={64} height={64} aspectRatio="aspect-square" />
                </div>
              )}
              <span className="font-medium">{title}</span>
            </Link>
          )
        })}
      </div>
      {col.productCardsFooterCtaEnabled && col.productCardsFooterCtaLabel && col.productCardsFooterCtaUrl && (
        <Link href={col.productCardsFooterCtaUrl} className="text-va-orange underline text-sm">
          {col.productCardsFooterCtaLabel}
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
