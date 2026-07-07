'use client'

import Link from 'next/link'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import {
  getTitleTag,
  getTitleSizeClass,
  type UspBlock as UspBlockType,
  type PortableTextBlock,
} from '@/lib/cms'
import { cn } from '@/lib/utils'

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
            const title = item.title ?? ''
            const description = item.description ?? null
            const link =
              item.linkEnabled && item.linkUrl && item.linkLabel
                ? { label: item.linkLabel, url: item.linkUrl }
                : null
            return (
              <div
                key={item._key ?? i}
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
                    <PortableText value={description as PortableTextBlock[]} tone={tone} />
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
