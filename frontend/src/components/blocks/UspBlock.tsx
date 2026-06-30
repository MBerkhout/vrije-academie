'use client'

import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import {
  cleanBlockValue,
  getTitleTag,
  getTitleSizeClass,
  type UspBlock as UspBlockType,
  type UspItem,
  type PortableTextBlock,
} from '@/lib/cms'
import { cn } from '@/lib/utils'

function getUspTitle(item: UspItem): string {
  if (!item) return ''
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast') return item.title ?? ''
  if (source === 'bibliotheek' && item.usp && typeof item.usp === 'object' && 'title' in item.usp) {
    return (item.usp as { title?: string }).title ?? ''
  }
  return ''
}

function getUspDescription(item: UspItem): PortableTextBlock[] | null {
  if (!item) return null
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast') return item.description ?? null
  if (source === 'bibliotheek' && item.usp && typeof item.usp === 'object' && 'description' in item.usp) {
    const desc = (item.usp as { description?: PortableTextBlock[] }).description
    return desc ?? null
  }
  return null
}

function getUspLink(item: UspItem): { label?: string; url?: string } | null {
  if (!item) return null
  const source = cleanBlockValue(item.source)
  if (source === 'aangepast' && item.linkEnabled) {
    return { label: item.linkLabel, url: item.linkUrl }
  }
  if (source === 'bibliotheek' && item.usp && typeof item.usp === 'object') {
    const usp = item.usp as { linkEnabled?: boolean; linkLabel?: string; linkUrl?: string }
    if (usp.linkEnabled) return { label: usp.linkLabel, url: usp.linkUrl }
  }
  return null
}

export function UspBlock({
  block,
  tone = 'default',
}: {
  block: UspBlockType
  tone?: 'default' | 'onDark'
}) {
  const items = block.items ?? []
  const Tag = getTitleTag(block.titleSize)
  const isDark = tone === 'onDark'

  return (
    <BlockWrapper block={block}>
      <div className="space-y-6">
        {block.title && (
          <Tag
            className={cn(
              getTitleSizeClass(block.titleSize),
              'font-sans font-bold',
              isDark ? 'text-white' : 'text-va-black',
            )}
          >
            {block.title}
          </Tag>
        )}
        <div
          className={cn(
            'flex flex-col items-center gap-8',
            block.itemsLayout === 'horizontal' &&
              'md:flex-row md:flex-wrap md:justify-center md:gap-16 lg:gap-20',
            isDark && 'border-y border-va-darkgray-800 py-8',
          )}
        >
          {items.map((item, i) => {
            const title = getUspTitle(item)
            const description = getUspDescription(item)
            const link = getUspLink(item)
            return (
              <div
                key={i}
                className={cn(
                  'flex w-full max-w-[240px] flex-none flex-col items-center text-center md:w-auto',
                  isDark && 'max-w-none text-center',
                )}
              >
                <h3
                  className={cn(
                    getTitleSizeClass('h2'),
                    'font-sans font-semibold',
                    isDark ? 'text-white' : 'text-va-black',
                  )}
                >
                  {title}
                </h3>
                <div
                  className="mt-0 mb-3 h-1 w-[100px] shrink-0 bg-va-yellow"
                  aria-hidden
                />
                {description && description.length > 0 && (
                  <div
                    className={cn(
                      'font-sans mb-2 [&_p:last-child]:!mb-0',
                      isDark ? 'text-va-gray-300' : 'text-va-darkgray',
                    )}
                  >
                    <PortableText value={description} tone={tone} />
                  </div>
                )}
                {link?.url && link?.label && (
                  <Link
                    href={link.url}
                    className={cn(
                      'underline font-sans',
                      isDark ? 'text-va-yellow' : 'text-va-orange',
                    )}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </BlockWrapper>
  )
}
