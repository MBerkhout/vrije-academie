import { commerceClient } from '@/lib/commerce'
import { getCategoriesForFilter } from '@/lib/cms/sanity-refs'
import { VaThuisCategoryGrid } from '@/components/vathuis/VaThuisCategoryGrid'
import type { VathuisCategoriesBlock as VathuisCategoriesBlockType } from '@/lib/cms'

export async function VathuisCategoriesBlock({ block }: { block: VathuisCategoriesBlockType }) {
  const [categories, facetResult] = await Promise.all([
    getCategoriesForFilter(),
    commerceClient.getVathuisPaginated({ limit: 1, offset: 0 }).catch(() => null),
  ])

  const facetSlugs = new Set(
    (facetResult?.facets?.categories ?? []).map((c) => c.slug),
  )

  const maxItems = block.maxItems ?? 5

  return <VaThuisCategoryGrid categories={categories} facetSlugs={facetSlugs} maxItems={maxItems} />
}
