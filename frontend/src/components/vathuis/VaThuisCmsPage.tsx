import type { Metadata } from 'next'
import { BlockRenderer } from '@/components/blocks'
import { buildSeoMetadata } from '@/lib/cms/seo-metadata'
import type { Page } from '@/lib/cms'

interface VaThuisCmsPageProps {
  page: Page
}

export function buildVaThuisPageMetadata(
  page: Page | null,
  fallbackTitle?: string,
  fallbackDescription?: string,
): Metadata {
  return buildSeoMetadata(page?.seo, {
    fallbackTitle,
    fallbackDescription,
  })
}

export function VaThuisCmsPage({ page }: VaThuisCmsPageProps) {
  const blocksBeforeFilter = page.blocks ?? []
  const blocks = blocksBeforeFilter.filter((b): b is NonNullable<typeof b> =>
    Boolean(b?._key ?? b?._id),
  )

  if (blocks.length === 0) {
    return (
      <div className="px-4 py-16 text-center font-sans text-va-gray-400">
        Geen inhoud op deze pagina. Voeg blokken toe in Sanity en publiceer de pagina.
      </div>
    )
  }

  return (
    <>
      {blocks.map((block) => {
        const b = block as { titleSize?: string; titleAlignment?: string }
        const hasTitleOptions = 'titleSize' in block || 'titleAlignment' in block
        const blockId = block._key ?? block._id
        const blockKey = hasTitleOptions
          ? `${blockId}-${b.titleSize ?? ''}-${b.titleAlignment ?? ''}`
          : blockId
        return <BlockRenderer key={blockKey} block={block} tone="onDark" />
      })}
    </>
  )
}
