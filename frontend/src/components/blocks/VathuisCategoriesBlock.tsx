import { commerceClient } from '@/lib/commerce'
import { getCategoriesForFilter, type CategoryOption } from '@/lib/cms/sanity-refs'
import { VaThuisCategoryGrid } from '@/components/vathuis/VaThuisCategoryGrid'
import type { VathuisCategoriesBlock as VathuisCategoriesBlockType } from '@/lib/cms'

function curatedCategories(block: VathuisCategoriesBlockType): CategoryOption[] {
  return (block.items ?? [])
    .map((item) => item.category)
    .filter((category): category is CategoryOption => Boolean(category?.slug))
}

export async function VathuisCategoriesBlock({ block }: { block: VathuisCategoriesBlockType }) {
  const maxItems = block.maxItems ?? 4
  const selected = curatedCategories(block)

  if (selected.length > 0) {
    return <VaThuisCategoryGrid categories={selected} maxItems={maxItems} />
  }

  const [categories, facetResult] = await Promise.all([
    getCategoriesForFilter(),
    commerceClient.getVathuisPaginated({ limit: 1, offset: 0 }).catch(() => null),
  ])

  const facetCategories = facetResult?.facets?.categories ?? []
  const facetSlugs =
    facetCategories.length > 0
      ? new Set(facetCategories.map((category) => category.slug))
      : undefined

  return (
    <VaThuisCategoryGrid categories={categories} facetSlugs={facetSlugs} maxItems={maxItems} />
  )
}
