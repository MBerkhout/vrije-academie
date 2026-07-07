import type { Metadata } from 'next'
import { cmsClient } from '@/lib/cms/server'
import { buildSeoMetadata } from '@/lib/cms/seo-metadata'
import { CONTAINER_CLASS } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

// Match other CMS pages: avoid indefinite static cache of Sanity content (e.g. category tile images).
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const page = await cmsClient.getPage('/')
  if (!page) {
    return buildSeoMetadata(undefined, {
      fallbackTitle: 'Vrije Academie',
      fallbackDescription: 'Kunst, geschiedenis en filosofie',
    })
  }

  return buildSeoMetadata(page.seo, {
    fallbackTitle: page.title ? `${page.title} | Vrije Academie` : 'Vrije Academie',
  })
}

export default async function Home() {
  const page = await cmsClient.getPage('/')

  if (!page) {
    return (
      <div className={CONTAINER_CLASS}>
        <h1 className="font-sans text-3xl font-bold text-va-black mb-4">
          Vrije Academie
        </h1>
        <p className="font-sans text-sm text-va-darkgray">
          Welcome to Vrije Academie
        </p>
      </div>
    )
  }

  const blocks = (page.blocks ?? []).filter((b): b is NonNullable<typeof b> =>
    Boolean(b?._key ?? b?._id),
  )

  return (
    <div>
      {blocks.map((block) => (
        <BlockRenderer key={block._key ?? block._id} block={block} />
      ))}
    </div>
  )
}
