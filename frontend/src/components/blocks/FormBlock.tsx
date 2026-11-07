'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { cn } from '@/lib/utils'
import { getTitleTag, getTitleSizeClass, type FormBlock as FormBlockType } from '@/lib/cms'
import { HubSpotFormEmbed } from '@/components/hubspot/HubSpotFormEmbed'
import { resolveHubSpotFormId } from '@/lib/hubspot/resolve-hubspot-form-id'

export function FormBlock({ block }: { block: FormBlockType }) {
  const Tag = getTitleTag(block.titleSize)
  const hubSpotFormId = resolveHubSpotFormId(block.hubSpotFormId, block.hubSpotForm)

  if (block.formSource === 'hubspot' && hubSpotFormId) {
    return (
      <BlockWrapper block={block}>
        <div className="max-w-2xl mx-auto space-y-6">
          {block.title && (
            <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>{block.title}</Tag>
          )}
          {block.introText && block.introText.length > 0 && (
            <PortableText value={block.introText} />
          )}
          <HubSpotFormEmbed formId={hubSpotFormId} />
        </div>
      </BlockWrapper>
    )
  }

  return null
}
