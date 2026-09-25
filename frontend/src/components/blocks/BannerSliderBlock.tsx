'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { ImageSlideStage } from '@/components/blocks/ImageSlideStage'
import type { BannerSliderBlock as BannerSliderBlockType } from '@/lib/cms'

const BANNER_SLIDE_SIZES = '100vw'

export function BannerSliderBlock({ block }: { block: BannerSliderBlockType }) {
  const slides = block.slides ?? []

  return (
    <BlockWrapper block={block}>
      <ImageSlideStage
        slides={slides}
        autoplay={block.autoplay}
        autoplayInterval={block.autoplayInterval}
        className="h-[400px] w-full"
        imageSizes={BANNER_SLIDE_SIZES}
        titleTag="h2"
        creativeSlotPrefix="banner_slider"
        promotionFallbackName="Banner slider"
      />
    </BlockWrapper>
  )
}
