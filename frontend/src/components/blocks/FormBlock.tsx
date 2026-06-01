'use client'

import { BlockWrapper } from '@/components/cms/BlockWrapper'
import { PortableText } from '@/components/cms/PortableText'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { getTitleTag, getTitleSizeClass, type FormBlock as FormBlockType } from '@/lib/cms'
import { FormRenderer } from '@sanity/form-toolkit/form-renderer'

export function FormBlock({ block }: { block: FormBlockType }) {
  const Tag = getTitleTag(block.titleSize)

  if (block.formSource === 'hubspot' && block.hubSpotForm) {
    return (
      <BlockWrapper block={block}>
        <div className="max-w-2xl mx-auto space-y-6">
          {block.title && (
            <Tag className={cn(getTitleSizeClass(block.titleSize), 'font-sans font-bold text-va-black')}>{block.title}</Tag>
          )}
          {block.introText && block.introText.length > 0 && (
            <PortableText value={block.introText} />
          )}
          {/* TODO(HUBSPOT): Embed HubSpot form by ID. HubSpot embed script or iframe. */}
          <div className="p-6 border border-va-lightgray rounded text-va-gray text-center">
            HubSpot form (ID: {block.hubSpotForm}) – embed placeholder. Configure HubSpot form embedding.
          </div>
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
