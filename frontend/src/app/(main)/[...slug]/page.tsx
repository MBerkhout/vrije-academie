import { notFound } from 'next/navigation'
import { cmsClient } from '@/lib/cms/server'
import { CONTAINER_CLASS } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export default async function SlugPage({ params }: PageProps) {
  const { slug: slugParts } = await params
  const slug = slugParts.join('/')
  const page = await cmsClient.getPage(slug)

  if (!page) {
    notFound()
  }

  const blocksBeforeFilter = page.blocks ?? []
  const blocks = blocksBeforeFilter.filter((b): b is NonNullable<typeof b> => Boolean(b?._id))

  return (
    <div>
      {blocks.length > 0 ? (
        blocks.map((block) => {
          const b = block as { titleSize?: string; titleAlignment?: string }
          const hasTitleOptions = 'titleSize' in block || 'titleAlignment' in block
          const blockKey = hasTitleOptions
            ? `${block._id}-${b.titleSize ?? ''}-${b.titleAlignment ?? ''}`
            : block._id
          return <BlockRenderer key={blockKey} block={block} />
        })
      ) : (
        <div className={CONTAINER_CLASS}>
          <p className="font-serif text-va-darkgray">
            Geen inhoud op deze pagina. Voeg blokken toe in Sanity en publiceer de pagina.
          </p>
        </div>
      )}
    </div>
  )
}
