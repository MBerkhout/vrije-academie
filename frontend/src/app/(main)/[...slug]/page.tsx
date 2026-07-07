import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cmsClient } from '@/lib/cms/server'
import { buildSeoMetadata } from '@/lib/cms/seo-metadata'
import { CONTAINER_CLASS } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

// Revalidate cached HTML every 60 s; on-demand revalidation from Sanity webhooks can lower this further.
export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: slugParts } = await params
  const slug = slugParts.join('/')
  const page = await cmsClient.getPage(slug)
  if (!page) return {}

  return buildSeoMetadata(page.seo, {
    fallbackTitle: page.title ? `${page.title} | Vrije Academie` : undefined,
  })
}

export default async function SlugPage({ params }: PageProps) {
  const { slug: slugParts } = await params
  const slug = slugParts.join('/')
  const page = await cmsClient.getPage(slug)

  if (!page) {
    notFound()
  }

  if (page.isVaThuis) {
    notFound()
  }

  const blocksBeforeFilter = page.blocks ?? []
  const blocks = blocksBeforeFilter.filter((b): b is NonNullable<typeof b> =>
    Boolean(b?._key ?? b?._id),
  )

  return (
    <div>
      {blocks.length > 0 ? (
        blocks.map((block) => {
          const b = block as { titleSize?: string; titleAlignment?: string }
          const hasTitleOptions = 'titleSize' in block || 'titleAlignment' in block
          const blockId = block._key ?? block._id
          const blockKey = hasTitleOptions
            ? `${blockId}-${b.titleSize ?? ''}-${b.titleAlignment ?? ''}`
            : blockId
          return <BlockRenderer key={blockKey} block={block} />
        })
      ) : (
        <div className={CONTAINER_CLASS}>
          <p className="font-sans text-va-darkgray">
            Geen inhoud op deze pagina. Voeg blokken toe in Sanity en publiceer de pagina.
          </p>
        </div>
      )}
    </div>
  )
}
