/**
 * Renders blocks allowed inside tabs (same set as columns).
 * Separate from BlockRenderer to avoid circular imports with TabsBlock.
 */

import { EventList } from './EventList'
import { TextBlock } from './TextBlock'
import { AfbeeldingBlock } from './AfbeeldingBlock'
import { AccordionBlock } from './AccordionBlock'
import { PersonsBlock } from './PersonsBlock'
import { WhitespaceBlock } from './WhitespaceBlock'
import { FormBlock } from './FormBlock'
import { DemandNearbyBlock } from './DemandNearbyBlock'
import { CategoriesBlock } from './CategoriesBlock'
import { UspBlock } from './UspBlock'
import { ReviewBlock } from './ReviewBlock'
import { ColumnsBlock } from './ColumnsBlock'
import type { Block } from '@/lib/cms'

interface TabContentRendererProps {
  block: Block
}

export function TabContentRenderer({ block }: TabContentRendererProps) {
  switch (block._type) {
    case 'eventList':
      return <EventList block={block as any} />
    case 'textBlock':
      return <TextBlock block={block as any} />
    case 'afbeeldingBlock':
      return <AfbeeldingBlock block={block as any} />
    case 'accordionBlock':
      return <AccordionBlock block={block as any} />
    case 'personsBlock':
      return <PersonsBlock block={block as any} />
    case 'whitespaceBlock':
      return <WhitespaceBlock block={block as any} />
    case 'formBlock':
      return <FormBlock block={block as any} />
    case 'demandNearbyBlock':
      return <DemandNearbyBlock block={block as any} />
    case 'categoriesBlock':
      return <CategoriesBlock block={block as any} />
    case 'uspBlock':
      return <UspBlock block={block as any} />
    case 'reviewBlock':
      return <ReviewBlock block={block as any} />
    case 'columnsBlock':
      return <ColumnsBlock block={block as any} />
    default:
      console.warn(`Tab content: unknown block type ${block._type}`)
      return null
  }
}
