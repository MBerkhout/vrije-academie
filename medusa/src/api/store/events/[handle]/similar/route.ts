import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productCategoriesLink from "../../../../../links/product-categories"
import productEventGroupLink from "../../../../../links/product-event-group"
import {
  productHasFutureAvailableSession,
  shuffleInPlace,
} from "../../../../../lib/event-session-eligibility"
import { minPriceCentsFromVariants } from "../../../../../lib/medusa-price-to-cents"
import { listCategoriesForProductIds } from "../../../../../lib/product-catalog-category-links"
import { filterStoreListingProductIds } from "../../../../../lib/store-listing-eligibility"
import { getRegistrationCountsByProduct } from "../../../../../lib/store-listing-snapshot"

const SIMILAR_LIMIT = 4

/**
 * GET /store/events/:handle/similar
 * Up to 4 related products in the same catalog category, sorted by most registrations
 * (completed orders). Only listable, future, available products.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle },
  })

  const currentProduct = products?.[0] as { id: string; handle?: string } | undefined
  if (!currentProduct?.id) {
    res.status(404).json({ message: "Event not found" })
    return
  }

  const currentId = currentProduct.id

  const { data: currentCatLinks } = await query.graph({
    entity: productCategoriesLink.entryPoint,
    fields: ["product_id", "catalog_category_id"],
    filters: { product_id: currentId },
  })

  const categoryIds = (currentCatLinks ?? [])
    .map((r: { catalog_category_id?: string }) => r.catalog_category_id)
    .filter(Boolean) as string[]

  if (!categoryIds.length) {
    res.json({ similar: [] })
    return
  }

  const { data: siblingCatLinks } = await query.graph({
    entity: productCategoriesLink.entryPoint,
    fields: ["product_id", "catalog_category_id"],
    filters: { catalog_category_id: categoryIds },
  })

  const candidateIds = [
    ...new Set(
      (siblingCatLinks ?? [])
        .map((r: { product_id?: string }) => r.product_id as string)
        .filter((id) => id && id !== currentId)
    ),
  ]

  if (!candidateIds.length) {
    res.json({ similar: [] })
    return
  }

  const [{ data: candidateProducts }, { data: eventGroupLinks }, registrationCounts] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "description",
          "thumbnail",
          "status",
          "created_at",
          "type.value",
          "variants.*",
          "variants.prices.*",
          "variants.event_item.*",
        ],
        filters: { id: candidateIds },
      }),
      query.graph({
        entity: productEventGroupLink.entryPoint,
        fields: ["product_id", "event_group.*"],
        filters: { product_id: candidateIds },
      }),
      getRegistrationCountsByProduct(req.scope),
    ])

  const productHandleById: Record<string, string | undefined> = {}
  const eventGroupByProduct: Record<string, { record_type?: string | null; show_in_plp?: boolean | null } | null> =
    {}
  for (const r of eventGroupLinks ?? []) {
    const row = r as { product_id?: string; event_group?: { record_type?: string; show_in_plp?: boolean } | null }
    if (row.product_id) eventGroupByProduct[row.product_id] = row.event_group ?? null
  }
  for (const p of candidateProducts ?? []) {
    const row = p as { id?: string; handle?: string }
    if (row.id) productHandleById[row.id] = row.handle
  }

  const listableIds = new Set(
    filterStoreListingProductIds(candidateIds, productHandleById, eventGroupByProduct)
  )

  type SimilarRow = Record<string, unknown> & {
    _registration_count: number
    _eligible: boolean
  }

  const enriched: SimilarRow[] = (candidateProducts ?? [])
    .filter((p: { id: string }) => listableIds.has(p.id))
    .map((p: Record<string, unknown>) => {
      const variants = (p.variants ?? []) as Record<string, unknown>[]
      const eventItems = variants
        .map((v) => v.event_item)
        .filter(Boolean) as Record<string, unknown>[]

      const futureItems = eventItems.filter((ei) => {
        const qty = Number(ei.available_quantity ?? 0)
        if (qty <= 0) return false
        const start = ei.start_at as string | undefined
        if (!start) return true
        return new Date(start).getTime() >= Date.now()
      })

      const earliestStartAt =
        futureItems
          .map((ei) => ei.start_at)
          .filter(Boolean)
          .sort()[0] ?? null

      const cities = [...new Set(eventItems.map((ei) => ei.city).filter(Boolean))] as string[]
      const deliveryTypes = [
        ...new Set(eventItems.map((ei) => ei.delivery_type).filter(Boolean)),
      ] as string[]

      const priceFrom = minPriceCentsFromVariants(
        variants as Parameters<typeof minPriceCentsFromVariants>[0]
      )
      const minAvailableQuantity = futureItems.length
        ? Math.min(...futureItems.map((ei) => Number(ei.available_quantity ?? 0)))
        : null

      const pid = p.id as string
      return {
        ...p,
        id: pid,
        record_type: eventGroupByProduct[pid]?.record_type ?? null,
        product_type: (p.type as { value?: string } | null | undefined)?.value ?? null,
        categories: [] as unknown[],
        cities,
        delivery_types: deliveryTypes,
        earliest_start_at: earliestStartAt,
        price_from: priceFrom,
        min_available_quantity: minAvailableQuantity,
        _registration_count: registrationCounts[pid] ?? 0,
        _eligible: productHasFutureAvailableSession(
          eventItems as Parameters<typeof productHasFutureAvailableSession>[0]
        ),
      }
    })
    .filter((p) => p._eligible)

  if (!enriched.length) {
    res.json({ similar: [] })
    return
  }

  const maxCount = Math.max(...enriched.map((p) => p._registration_count))
  const usePopularitySort = maxCount > 0

  let ordered = enriched
  if (usePopularitySort) {
    ordered = [...enriched].sort((a, b) => {
      const countDiff = b._registration_count - a._registration_count
      if (countDiff !== 0) return countDiff
      const aDate = a.earliest_start_at
        ? new Date(a.earliest_start_at as string).getTime()
        : Infinity
      const bDate = b.earliest_start_at
        ? new Date(b.earliest_start_at as string).getTime()
        : Infinity
      if (aDate !== bDate) return aDate - bDate
      return (
        new Date((b.created_at as string) ?? 0).getTime() -
        new Date((a.created_at as string) ?? 0).getTime()
      )
    })
  } else {
    ordered = shuffleInPlace(enriched)
  }

  const topIds = ordered.slice(0, SIMILAR_LIMIT).map((p) => p.id as string)
  const { byProductId: categoriesByProduct } = await listCategoriesForProductIds(
    req.scope,
    topIds
  )

  const similar = ordered.slice(0, SIMILAR_LIMIT).map((row) => {
    const { _registration_count, _eligible, ...rest } = row
    return {
      ...rest,
      categories: categoriesByProduct[row.id as string] ?? [],
    }
  })

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
  res.json({ similar })
}
