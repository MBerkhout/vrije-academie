import { cleanBlockValue, type ProductRowBlock as ProductRowBlockType } from '@/lib/cms'
import { commerceClient } from '@/lib/commerce'
import { resolveProductRowEvents } from '@/lib/commerce/resolve-product-row-events'
import { ProductRowBlockView } from './ProductRowBlockView'

interface ProductRowBlockProps {
  block: ProductRowBlockType
}

function hideWithoutUpcomingSessions(block: ProductRowBlockType): boolean {
  return block.hideWithoutUpcomingSessions !== false
}

async function resolveHandpickedEvents(block: ProductRowBlockType) {
  const handles = (block.products ?? [])
    .map((p) => (typeof p === 'object' && p?.handle ? p.handle.trim() : ''))
    .filter(Boolean)
  if (handles.length === 0) return []

  return resolveProductRowEvents(handles, {
    hideWithoutUpcomingSessions: hideWithoutUpcomingSessions(block),
    batchRequests: true,
  })
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
