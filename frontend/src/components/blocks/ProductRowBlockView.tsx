import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { Button } from '@/components/ui'
import { PlpEventCard } from '@/components/plp/PlpEventCard'
import {
  cleanBlockValue,
  getTitleTag,
  getTitleSizeClass,
  type ProductRowBlock as ProductRowBlockType,
} from '@/lib/cms'
import type { EventCard } from '@/lib/commerce'
import { cn } from '@/lib/utils'
import { ProductRowCarousel, ProductRowCarouselSlide } from './ProductRowCarousel'

const STOCK_THRESHOLD = 5

interface ProductRowBlockViewProps {
  block: ProductRowBlockType
  events: EventCard[]
  heading?: string
}

export function ProductRowBlockView({ block, events, heading }: ProductRowBlockViewProps) {
  if (events.length === 0) return null

  const title = heading ?? block.title ?? ''
  const Tag = getTitleTag(block.titleSize)
  const ariaLabel = title || 'Productkaarten'

  return (
    <BlockWrapper block={block}>
      <div className="space-y-6">
        {title && (
          <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>
            {title}
          </Tag>
        )}

        <ProductRowCarousel ariaLabel={ariaLabel}>
          {events.map((event) => (
            <ProductRowCarouselSlide key={event.id}>
              <PlpEventCard event={event} stockThreshold={STOCK_THRESHOLD} equalizeHeight />
            </ProductRowCarouselSlide>
          ))}
        </ProductRowCarousel>

        {block.ctaEnabled && block.ctaLabel && block.ctaUrl && (
          <div className="flex justify-center pt-2">
            <Button variant="primary" href={block.ctaUrl}>
              {block.ctaLabel}
            </Button>
          </div>
        )}
      </div>
    </BlockWrapper>
  )
}
