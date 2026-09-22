'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { getTitleTag, getTitleSizeClass, cleanBlockValue } from '@/lib/cms'
import type { TextBlock as TextBlockType } from '@/lib/cms'
import { cn } from '@/lib/utils'

const TEXT_CONTENT_WIDTH_CLASS = {
  narrow: 'max-w-xl',
  normal: 'max-w-3xl',
  wide: 'max-w-full',
} as const

const TITLE_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

export function TextBlock({ block, tone = 'default' }: { block: TextBlockType; tone?: 'default' | 'onDark' }) {
  const isDark = tone === 'onDark'
  const TitleTag = getTitleTag(block.titleSize)
  const cw = cleanBlockValue(block.contentWidth) ?? 'normal'
  const widthClass =
    TEXT_CONTENT_WIDTH_CLASS[cw as keyof typeof TEXT_CONTENT_WIDTH_CLASS] ?? TEXT_CONTENT_WIDTH_CLASS.normal
  const titleAlignment = cleanBlockValue(block.titleAlignment) ?? 'left'
  const alignmentClass = TITLE_CLASS[titleAlignment]
  const title = cleanBlockValue(block.title)?.trim()
  const subtitle = cleanBlockValue(block.subtitle)?.trim()
  const showDivider = Boolean(block.showTitleDivider) && Boolean(title) && Boolean(subtitle)

  return (
    <BlockWrapper block={block}>
      <div className={cn('font-sans w-full mx-auto', widthClass)}>
        {block.title && (
          <div
            className={cn(
              'w-fit max-w-full',
              titleAlignment === 'center' && 'mx-auto',
              titleAlignment === 'right' && 'ml-auto',
            )}
          >
            <TitleTag
              className={cn(
                getTitleSizeClass(block.titleSize),
                'font-bold',
                subtitle || showDivider ? 'mb-0' : 'mb-4',
                isDark ? 'text-white' : 'text-va-black',
                alignmentClass,
              )}
            >
              {block.title}
            </TitleTag>
            {showDivider && (
              <hr className="mt-3 mb-3 h-1 w-full border-0 bg-va-yellow" />
            )}
          </div>
        )}
        {subtitle && (
          <p
            className={cn(
              getTitleSizeClass('h3'),
              'font-semibold mb-4',
              !showDivider && 'mt-2',
              isDark ? 'text-white' : 'text-va-black',
              alignmentClass,
            )}
          >
            {subtitle}
          </p>
        )}
        {block.content && block.content.length > 0 && (
          <div>
            <PortableText value={block.content} tone={tone} />
          </div>
        )}
      </div>
    </BlockWrapper>
  )
}
