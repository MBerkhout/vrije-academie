'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { cn } from '@/lib/utils'
import { getTitleTag, getTitleSizeClass, type FormBlock as FormBlockType } from '@/lib/cms'
import { FormRenderer } from '@sanity/form-toolkit/form-renderer'
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

  if (block.formSource === 'sanity' && block.form) {
    return (
      <BlockWrapper block={block}>
        <div className="max-w-2xl mx-auto space-y-6">
          {block.title && (
            <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>{block.title}</Tag>
          )}
          {block.introText && block.introText.length > 0 && (
            <PortableText value={block.introText} />
          )}
          <FormRenderer
            formData={block.form as any}
            action="/api/form-submit"
            method="post"
            encType="multipart/form-data"
          />
        </div>
      </BlockWrapper>
    )
  }

  return null
}
