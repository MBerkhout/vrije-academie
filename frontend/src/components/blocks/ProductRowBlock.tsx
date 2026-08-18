import { commerceClient } from '@/lib/commerce'
import { cleanBlockValue, type ProductRowBlock as ProductRowBlockType } from '@/lib/cms'
import { ProductRowBlockView } from './ProductRowBlockView'

interface ProductRowBlockProps {
  block: ProductRowBlockType
}

async function resolveHandpickedEvents(block: ProductRowBlockType) {
  const handles = (block.products ?? [])
    .map((p) => (typeof p === 'object' && p?.handle ? p.handle.trim() : ''))
    .filter(Boolean)
  if (handles.length === 0) return []

  const results = await Promise.all(
    handles.map((handle) => commerceClient.getEvent(handle).catch(() => null))
  )
  return results.filter((e): e is NonNullable<typeof e> => e != null)
}

async function resolveAutomatedEvents(block: ProductRowBlockType) {
  const feed = cleanBlockValue(block.automatedFeed)
  const sort = feed === 'newest' ? 'newest' : 'popularity'
  const result = await commerceClient
    .getEventsPaginated({
      limit: 4,
      offset: 0,
      sort,
    })
    .catch(() => null)
  return result?.events ?? []
}

export async function ProductRowBlock({ block }: ProductRowBlockProps) {
  const sourceType = cleanBlockValue(block.sourceType) ?? 'handpicked'
  const events =
    sourceType === 'automated'
      ? await resolveAutomatedEvents(block)
      : await resolveHandpickedEvents(block)

  return <ProductRowBlockView block={block} events={events} />
}
