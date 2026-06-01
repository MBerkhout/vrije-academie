'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { cleanBlockValue, type WhitespaceBlock as WhitespaceBlockType } from '@/lib/cms'

const HEIGHT_CLASS: Record<string, string> = {
  xs: 'h-4 md:h-4',
  sm: 'h-6 md:h-6',
  md: 'h-6 md:h-12',
  lg: 'h-12 md:h-20',
  xl: 'h-16 md:h-28',
  '2xl': 'h-20 md:h-36',
}

export function WhitespaceBlock({ block }: { block: WhitespaceBlockType }) {
  const height = cleanBlockValue(block.height) ?? 'md'
  const heightStyle =
    height === 'custom' && block.customHeight != null
      ? { height: `${block.customHeight}px` }
      : undefined
  const heightClass = height !== 'custom' ? HEIGHT_CLASS[height] ?? 'h-6 md:h-12' : ''

  return (
    <BlockWrapper block={block}>
      <div
        className={heightClass}
        style={heightStyle}
        aria-hidden
      />
    </BlockWrapper>
  )
}
