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

export function TextBlock({ block }: { block: TextBlockType }) {
  const TitleTag = getTitleTag(block.titleSize)
  const cw = cleanBlockValue(block.contentWidth) ?? 'normal'
  const widthClass =
    TEXT_CONTENT_WIDTH_CLASS[cw as keyof typeof TEXT_CONTENT_WIDTH_CLASS] ?? TEXT_CONTENT_WIDTH_CLASS.normal
  const alignmentClass = TITLE_CLASS[cleanBlockValue(block.titleAlignment) ?? 'left']

  return (
    <BlockWrapper block={block}>
      <div className={cn('font-sans w-full mx-auto', widthClass)}>
        {block.title && (
          <TitleTag className={cn(getTitleSizeClass(block.titleSize), 'font-bold text-va-black mb-4', alignmentClass)}>
            {block.title}
          </TitleTag>
        )}
        {block.content && block.content.length > 0 && (
          <div>
            <PortableText value={block.content} />
          </div>
        )}
      </div>
    </BlockWrapper>
  )
}
