import { commerceClient } from '@/lib/commerce'
import { cmsClient } from '@/lib/cms/server'
import { cleanBlockValue, type VathuisProductRowBlock as VathuisProductRowBlockType } from '@/lib/cms'
import { VaThuisFeaturedGrid } from '@/components/vathuis/VaThuisFeaturedGrid'

async function resolveHandpickedEvents(block: VathuisProductRowBlockType) {
  const handles = (block.products ?? [])
    .map((p) => (typeof p === 'object' && p?.handle ? p.handle.trim() : ''))
    .filter(Boolean)
  if (handles.length === 0) return []

  const results = await Promise.all(handles.map((handle) => commerceClient.getEvent(handle)))
  return results.filter((e): e is NonNullable<typeof e> => e != null && e.purchase_mode === 'bundle_only')
}

async function resolveAutomatedEvents(block: VathuisProductRowBlockType) {
  const limit = Math.min(12, Math.max(1, block.limit ?? 8))
  const result = await commerceClient.getVathuisPaginated({ sort: 'newest', limit, offset: 0 })
  return result?.items ?? []
}

export async function VathuisProductRowBlock({ block }: { block: VathuisProductRowBlockType }) {
  const sourceType = cleanBlockValue(block.sourceType) ?? 'automated'
  const events =
    sourceType === 'handpicked'
      ? await resolveHandpickedEvents(block)
      : await resolveAutomatedEvents(block)

  const settings = await cmsClient.getGeneralSettings()
  const stockThreshold = settings?.pdp?.lowStockThreshold ?? 5

  return (
    <VaThuisFeaturedGrid
      title={block.title?.trim() || 'Nieuw binnen'}
      events={events}
      stockThreshold={stockThreshold}
      catalogCtaLabel={block.catalogCtaLabel}
    />
  )
}
