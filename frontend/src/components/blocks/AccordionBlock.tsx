'use client'

import { useState } from 'react'
import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { getTitleTag, getTitleSizeClass, cleanBlockValue } from '@/lib/cms'
import type { AccordionBlock as AccordionBlockType } from '@/lib/cms'
import { cn } from '@/lib/utils'

export function AccordionBlock({ block }: { block: AccordionBlockType }) {
  const items = block.items ?? []
  const allowMultiple = cleanBlockValue(block.allowMultipleOpen) ?? false
  const [openIndices, setOpenIndices] = useState<Set<number>>(
    () => new Set(items.length > 0 ? [0] : [])
  )

  const toggle = (i: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev)
      if (next.has(i)) {
        next.delete(i)
      } else {
        if (!allowMultiple) next.clear()
        next.add(i)
      }
      return next
    })
  }

  const TitleTag = getTitleTag(block.titleSize ?? 'h3')

  return (
    <BlockWrapper block={block}>
      <div className="font-sans">
        {block.title && (
          <TitleTag className={cn(getTitleSizeClass(block.titleSize ?? 'h3'), 'font-bold text-va-black mb-4')}>
            {block.title}
          </TitleTag>
        )}
        <div className="divide-y divide-va-lightgray border border-va-lightgray rounded-lg overflow-hidden">
          {items.map((item, i) => {
            const isOpen = openIndices.has(i)
            return (
              <div key={i} className="bg-white">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    'w-full flex items-center justify-between gap-4 px-4 py-3 text-left font-sans font-semibold text-va-black hover:bg-va-lightgray/50 transition-colors cursor-pointer',
                    isOpen && 'bg-va-lightgray/30'
                  )}
                  aria-expanded={isOpen}
                  aria-controls={`accordion-answer-${block._id}-${i}`}
                  id={`accordion-question-${block._id}-${i}`}
                >
                  <span>{item.question}</span>
                  {/* Animated +/- icon: horizontal bar always visible, vertical bar fades/scales out when open */}
                  <span className="flex-shrink-0 w-4 h-4 relative flex items-center justify-center" aria-hidden>
                    <span className="absolute w-full h-px bg-va-gray rounded-full transition-transform duration-300" />
                    <span
                      className={cn(
                        'absolute h-full w-px bg-va-gray rounded-full transition-all duration-300',
                        isOpen ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'
                      )}
                    />
                  </span>
                </button>
                {/* CSS grid trick: animates from 0fr → 1fr for smooth height transition */}
                <div
                  id={`accordion-answer-${block._id}-${i}`}
                  role="region"
                  aria-labelledby={`accordion-question-${block._id}-${i}`}
                  aria-hidden={!isOpen}
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-3 text-va-darkgray border-t border-va-lightgray">
                      {item.answer && <PortableText value={item.answer} />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BlockWrapper>
  )
}
