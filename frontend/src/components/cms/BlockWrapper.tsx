'use client'

import {
  getBlockContainerStyles,
  getBlockContainerWidthClass,
  getBlockBackgroundClass,
  getBlockSectionDomId,
} from '@/lib/cms'
import type { Block } from '@/lib/cms'
import { cn } from '@/lib/utils'

interface BlockWrapperProps {
  block: Block
  children: React.ReactNode
  className?: string
}

const devBlockDataAttrs =
  process.env.NODE_ENV === 'development'
    ? (block: Block) =>
        block._id
          ? ({
              'data-cms-block-id': block._id,
              'data-cms-block-type': block._type,
            } as const)
          : null
    : () => null

export function BlockWrapper({ block, children, className }: BlockWrapperProps) {
  const styles = getBlockContainerStyles(block)
  const widthClass = getBlockContainerWidthClass(block)
  const bgClass = getBlockBackgroundClass(block)
  const devAttrs = devBlockDataAttrs(block)
  const sectionId = getBlockSectionDomId(block as Record<string, unknown>)

  return (
    <div
      id={sectionId}
      className={cn(widthClass, bgClass, sectionId && 'scroll-mt-20', className)}
      style={styles}
      {...(devAttrs ?? {})}
    >
      {children}
    </div>
  )
}
