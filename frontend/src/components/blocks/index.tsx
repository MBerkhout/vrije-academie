/**
 * Block renderer - maps block types to components
 */

import { EventList } from './EventList'
import { TextBlock } from './TextBlock'
import { AfbeeldingBlock } from './AfbeeldingBlock'
import { AccordionBlock } from './AccordionBlock'
import { WhitespaceBlock } from './WhitespaceBlock'
import { TabsBlock } from './TabsBlock'
import { FormBlock } from './FormBlock'
import { DemandNearbyBlock } from './DemandNearbyBlock'
import { HeroBlock } from './HeroBlock'
import { SanityImage } from '@/components/cms/SanityImage'
import { ProductRowBlock } from './ProductRowBlock'
import { ProductRowBlockPersonalized } from './ProductRowBlockPersonalized'
import { CategoriesBlock } from './CategoriesBlock'
import { UspBlock } from './UspBlock'
import { ReviewBlock } from './ReviewBlock'
import { PersonsBlock } from './PersonsBlock'
import { ColumnsBlock } from './ColumnsBlock'
import { EditorialCardsBlock } from './EditorialCardsBlock'
import { GiftCardBlock } from './GiftCardBlock'
import { VathuisHeroBlock } from './VathuisHeroBlock'
import { VathuisCategoriesBlock } from './VathuisCategoriesBlock'
import { VathuisProductRowBlock } from './VathuisProductRowBlock'
import { VathuisTeachersBlock } from './VathuisTeachersBlock'
import { VathuisPromoTilesBlock } from './VathuisPromoTilesBlock'
import { cleanBlockValue, type Block, type HeroBlock as HeroBlockType } from '@/lib/cms'

interface BlockRendererProps {
  block: Block
  tone?: 'default' | 'onDark'
}

export function BlockRenderer({ block, tone = 'default' }: BlockRendererProps) {
  switch (block._type) {
    case 'eventList':
      return <EventList block={block as any} />
    case 'textBlock':
      return <TextBlock block={block as any} tone={tone} />
    case 'afbeeldingBlock':
      return <AfbeeldingBlock block={block as any} />
    case 'accordionBlock':
      return <AccordionBlock block={block as any} />
    case 'whitespaceBlock':
      return <WhitespaceBlock block={block as any} />
    case 'tabsBlock':
      return <TabsBlock block={block as any} />
    case 'formBlock':
      return <FormBlock block={block as any} />
    case 'demandNearbyBlock':
      return <DemandNearbyBlock block={block as any} />
    case 'heroBlock': {
      const heroBlock = block as HeroBlockType
      const firstSlide = heroBlock.slides?.[0]
      const lcpImage =
        firstSlide?.backgroundImage?.asset != null ? (
          <SanityImage
            source={firstSlide.backgroundImage}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
            priority
          />
        ) : undefined
      return <HeroBlock block={heroBlock} lcpImage={lcpImage} />
    }
    case 'productRowBlock': {
      const sourceType = cleanBlockValue((block as { sourceType?: string }).sourceType)
      if (sourceType === 'personalized') {
        return <ProductRowBlockPersonalized block={block as any} />
      }
      return <ProductRowBlock block={block as any} />
    }
    case 'categoriesBlock':
      return <CategoriesBlock block={block as any} />
    case 'uspBlock':
      return <UspBlock block={block as any} tone={tone} />
    case 'reviewBlock':
      return <ReviewBlock block={block as any} />
    case 'personsBlock':
      return <PersonsBlock block={block as any} />
    case 'columnsBlock':
      return <ColumnsBlock block={block as any} />
    case 'editorialCardsBlock':
      return <EditorialCardsBlock block={block as any} />
    case 'giftCardBlock':
      return <GiftCardBlock block={block} />
    case 'vathuisHeroBlock':
      return <VathuisHeroBlock block={block as any} />
    case 'vathuisCategoriesBlock':
      return <VathuisCategoriesBlock block={block as any} />
    case 'vathuisProductRowBlock':
      return <VathuisProductRowBlock block={block as any} />
    case 'vathuisTeachersBlock':
      return <VathuisTeachersBlock block={block as any} />
    case 'vathuisPromoTilesBlock':
      return <VathuisPromoTilesBlock block={block as any} />
    default:
      console.warn(`Unknown block type: ${block._type}`)
      return null
  }
}
