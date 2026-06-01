'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { CitySuggestField } from '@/components/search/CitySuggestField'
import {
  CONTAINER_CLASS,
  getTitleTag,
  getTitleSizeClass,
  type DemandNearbyBlock as DemandNearbyBlockType,
} from '@/lib/cms'
import { cn } from '@/lib/utils'
import formStrings from '@/content/form-strings.json'
import cityMapBg from '@/assets/city-map.jpg'

const { inputPlaceholder, buttonLabel } = formStrings.demandNearby

const DEFAULT_HEADING = 'Bekijk het aanbod bij jou in de buurt'

export function DemandNearbyBlock({ block }: { block: DemandNearbyBlockType }) {
  const TitleTag = getTitleTag(block.titleSize)
  const headingText = block.title?.trim() || DEFAULT_HEADING

  return (
    <BlockWrapper
      block={block}
      className="relative isolate !bg-transparent !max-w-none w-full !px-0"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#f3f3f3]"
        aria-hidden
      >
        <img
          src={cityMapBg.src}
          width={cityMapBg.width}
          height={cityMapBg.height}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="low"
        />
        <div className="absolute inset-0 bg-[#f3f3f3]/78" />
      </div>
      <div
        className={cn(
          CONTAINER_CLASS,
          'relative z-10 flex justify-center py-10 md:py-14'
        )}
      >
        <div className="w-full max-w-xl rounded-2xl bg-va-yellow-200 px-8 py-8 md:px-10 md:py-10">
          <TitleTag
            className={cn(
              getTitleSizeClass(block.titleSize),
              'mb-6 text-balance text-center font-sans font-semibold text-va-black-800 md:mb-8'
            )}
          >
            {headingText}
          </TitleTag>
          {block.introText && block.introText.length > 0 && (
            <div className="mb-6 text-center font-serif text-va-darkgray md:mb-8 [&_p]:text-pretty">
              <PortableText value={block.introText} />
            </div>
          )}
          <CitySuggestField
            inputId="demand-nearby-city"
            placeholder={inputPlaceholder}
            buttonLabel={buttonLabel}
          />
        </div>
      </div>
    </BlockWrapper>
  )
}
