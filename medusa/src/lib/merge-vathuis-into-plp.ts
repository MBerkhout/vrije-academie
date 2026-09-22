export const VATHUIS_DELIVERY_TYPE = "pre_recorded"

export function withVathuisDeliveryType(
  row: Record<string, unknown>
): Record<string, unknown> {
  const existing = ((row.delivery_types ?? []) as string[]).filter(Boolean)
  if (existing.includes(VATHUIS_DELIVERY_TYPE)) {
    return row
  }
  return { ...row, delivery_types: [...existing, VATHUIS_DELIVERY_TYPE] }
}

export function mergeVathuisIntoPlpList(
  plpList: Record<string, unknown>[],
  vathuisList: Record<string, unknown>[]
): Record<string, unknown>[] {
  const seen = new Set(
    plpList.map((row) => row.id as string | undefined).filter((id): id is string => Boolean(id))
  )
  const extra: Record<string, unknown>[] = []
  for (const row of vathuisList) {
    const id = row.id as string | undefined
    if (!id || seen.has(id)) continue
    seen.add(id)
    extra.push(withVathuisDeliveryType(row))
  }
  return extra.length ? [...plpList, ...extra] : plpList
}

export function countPreRecordedDelivery(list: Record<string, unknown>[]): number {
  return list.filter((row) =>
    ((row.delivery_types ?? []) as string[]).includes(VATHUIS_DELIVERY_TYPE)
  ).length
}

/** Unique pre_recorded rows after merging the VAthuis catalog onto the current list. */
export function countVathuisDeliveryFacet(
  list: Record<string, unknown>[],
  vathuisList: Record<string, unknown>[]
): number {
  return countPreRecordedDelivery(mergeVathuisIntoPlpList(list, vathuisList))
}

export function injectVathuisDeliveryFacet(
  facets: Record<string, unknown>,
  vathuisCount: number
): Record<string, unknown> {
  const delivery = [
    ...(((facets.delivery_type ?? []) as { slug: string; count: number }[])),
  ]
  const idx = delivery.findIndex((entry) => entry.slug === VATHUIS_DELIVERY_TYPE)
  if (idx >= 0) {
    delivery[idx] = { slug: VATHUIS_DELIVERY_TYPE, count: vathuisCount }
  } else if (vathuisCount > 0) {
    delivery.push({ slug: VATHUIS_DELIVERY_TYPE, count: vathuisCount })
  }
  return { ...facets, delivery_type: delivery }
}

export function isVathuisListingRow(row: Record<string, unknown>): boolean {
  return row.record_type === "vathuis" || row.purchase_mode === "bundle_only"
}

/** Category and teacher buckets from listing rows (PLP and VAthuis snapshots both embed these). */
export function taxonomyFacetsFromListingRows(list: Record<string, unknown>[]): {
  categories: { slug: string; label: string; count: number }[]
  docenten: { slug: string; name: string; count: number }[]
} {
  const categoryCounts: Record<string, { slug: string; label: string; count: number }> = {}
  const docentCounts: Record<string, { slug: string; name: string; count: number }> = {}

  for (const product of list) {
    for (const category of (product.categories ?? []) as { slug?: string; label?: string }[]) {
      if (!category.slug) continue
      if (!categoryCounts[category.slug]) {
        categoryCounts[category.slug] = {
          slug: category.slug,
          label: category.label ?? category.slug,
          count: 0,
        }
      }
      categoryCounts[category.slug].count++
    }

    for (const docent of (product.docenten ?? []) as { slug?: string; name?: string }[]) {
      if (!docent.slug) continue
      if (!docentCounts[docent.slug]) {
        docentCounts[docent.slug] = {
          slug: docent.slug,
          name: docent.name ?? docent.slug,
          count: 0,
        }
      }
      docentCounts[docent.slug].count++
    }
  }

  return {
    categories: Object.values(categoryCounts),
    docenten: Object.values(docentCounts),
  }
}
