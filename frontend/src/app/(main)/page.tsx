import { cmsClient } from '@/lib/cms/server'
import { CONTAINER_CLASS } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

export default async function Home() {
  const page = await cmsClient.getPage('/')

  if (!page) {
    return (
      <div className={CONTAINER_CLASS}>
        <h1 className="font-sans text-3xl font-bold text-va-black mb-4">
          Vrije Academie
        </h1>
        <p className="font-serif text-sm text-va-darkgray">
          Welcome to Vrije Academie
        </p>
      </div>
    )
  }

  const blocks = (page.blocks ?? []).filter((b): b is NonNullable<typeof b> => Boolean(b?._id))

  return (
    <div>
      {blocks.map((block) => (
        <BlockRenderer key={block._id} block={block} />
      ))}
    </div>
  )
}
