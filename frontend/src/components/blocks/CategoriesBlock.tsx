'use client'

import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { SanityImage } from '@/components/cms/SanityImage'
import { Button } from '@/components/ui'
import {
  cleanBlockValue,
  getTitleTag,
  getTitleSizeClass,
  type CategoriesBlock as CategoriesBlockType,
  type CategoryItem,
} from '@/lib/cms'
import { plpCategoryHref } from '@/lib/routes'
import { categoryDisplayTitle } from '@/lib/cms/sanity-refs'
import { cn } from '@/lib/utils'

function getItemUrl(item: CategoryItem): string {
  if (!item) return '#'
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast' && item.url) return item.url
  if (source === 'bibliotheek' && item.category && typeof item.category === 'object') {
    const cat = item.category as { slug?: string; linkUrl?: string }
    const override = cat.linkUrl?.trim()
    if (override) return override
    if (cat.slug) return plpCategoryHref(cat.slug)
  }
  return '#'
}

function getItemLabel(item: CategoryItem): string {
  if (!item) return ''
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast') return item.label ?? ''
  if (source === 'bibliotheek' && item.category && typeof item.category === 'object' && 'label' in item.category) {
    return categoryDisplayTitle(item.category as { title?: string; label?: string })
  }
  return ''
}

function getItemImage(item: CategoryItem) {
  if (!item) return null
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast') return item.image
  if (source === 'bibliotheek' && item.category && typeof item.category === 'object' && 'image' in item.category) {
    return (item.category as { image?: { asset?: unknown } }).image
  }
  return null
}

export function CategoriesBlock({ block }: { block: CategoriesBlockType }) {
  const items = block.items ?? []
  const cols = block.columnsDesktop === '8' ? 'lg:grid-cols-8' : 'lg:grid-cols-4'

  const Tag = getTitleTag(block.titleSize)

  const hasLead = Boolean(block.title) || Boolean(block.introText?.length)
  const hasCta = Boolean(block.ctaEnabled && block.ctaLabel && block.ctaUrl)
  const hasSidebar = hasLead || hasCta

  return (
    <BlockWrapper block={block}>
      <div className="space-y-6">
        <div
          className={cn(
            'flex flex-col gap-6',
            hasSidebar && 'lg:flex-row lg:items-start lg:gap-8 xl:gap-10',
          )}
        >
          {hasSidebar && (
            <div className="shrink-0 space-y-4 lg:w-[250px]">
              {block.title && (
                <div className="space-y-3">
                  <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>
                    {block.title}
                  </Tag>
                  <div
                    className="h-1 max-w-[100px] bg-va-yellow"
                    aria-hidden
                  />
                </div>
              )}
              {block.introText && block.introText.length > 0 && (
                <PortableText value={block.introText} />
              )}
              {hasCta && (
                <Button
                  variant="ghost"
                  href={block.ctaUrl}
                  className={cn(
                    'h-auto w-full justify-start rounded-none px-0 py-0 text-left',
                    'font-sans text-sm font-bold uppercase tracking-wide',
                    'bg-transparent text-va-black underline decoration-va-black decoration-1 underline-offset-[5px]',
                    'hover:bg-transparent hover:text-va-orange hover:underline hover:decoration-va-yellow',
                    'active:bg-transparent',
                    'focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2',
                    'lg:w-auto',
                  )}
                >
                  {block.ctaLabel}
                  {' >'}
                </Button>
              )}
            </div>
          )}
          <div
            className={cn(
              'grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-3',
              cols,
              hasSidebar && 'min-w-0 flex-1',
            )}
          >
          {items.map((item, i) => {
            const url = getItemUrl(item)
            const label = getItemLabel(item)
            const image = getItemImage(item)
            return (
              <Link
                key={i}
                href={url}
                className={cn(
                  'group flex min-h-[90px] flex-row items-stretch rounded-lg',
                  'border border-va-lightgray bg-white',
                  'shadow hover:shadow-md hover:border-va-black/25',
                  'transition-[box-shadow,border-color] duration-200',
                  'outline-none focus-visible:ring-2 focus-visible:ring-va-yellow focus-visible:ring-offset-2',
                )}
                aria-label={label ? `${label} — bekijk aanbod` : 'Bekijk aanbod'}
              >
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 py-2 sm:px-3 sm:py-2.5',
                    image && 'border-r-[3px] border-va-yellow',
                  )}
                >
                  <span className="min-w-0 font-sans text-sm font-semibold leading-snug text-va-black transition-colors group-hover:text-va-orange sm:text-base">
                    {label}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-va-darkgray transition-colors group-hover:text-va-black">
                    Bekijk
                    <svg
                      className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </div>
                {image ? (
                  <div className="relative w-[75px] shrink-0 self-stretch overflow-hidden rounded-r-lg bg-va-lightgray">
                    <SanityImage
                      source={image}
                      fill
                      aspectRatio=""
                      className="h-full min-h-0"
                      sizes="75px"
                    />
                  </div>
                ) : null}
              </Link>
            )
          })}
          </div>
        </div>
      </div>
    </BlockWrapper>
  )
}
