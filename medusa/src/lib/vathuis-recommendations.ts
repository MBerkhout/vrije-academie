import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productCategoriesLink from "../links/product-categories"
import { getRegistrationCountsByProduct, getVathuisListingSnapshot } from "./store-listing-snapshot"
import { compareBySalesforceOrder, tieBreakByTitle } from "./listing-sort"

const RECOMMENDATION_LIMIT = 4

type CategoryRef = { id?: string; slug?: string }

export type VathuisRecommendationInput = {
  /** Exclude these product ids (e.g. already purchased). */
  excludeProductIds?: string[]
  /** Prefer same catalog category slugs as purchased products. */
  categorySlugs?: string[]
  /** When set, use same-category similar logic as PDP (then fallback). */
  similarToHandle?: string | null
}

/**
 * Up to 4 VA Thuis products: same category as `similarToHandle` or `categorySlugs`,
 * else top items by Salesforce order / registrations.
 */
export async function getVathuisRecommendations(
  scope: MedusaContainer,
  input: VathuisRecommendationInput = {}
): Promise<Record<string, unknown>[]> {
  const exclude = new Set(input.excludeProductIds ?? [])
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const [snapshot, registrationCounts] = await Promise.all([
    getVathuisListingSnapshot(scope),
    getRegistrationCountsByProduct(scope),
  ])

  let categorySlugs = new Set(
    (input.categorySlugs ?? []).map((s) => s.trim()).filter(Boolean)
  )

  if (input.similarToHandle?.trim()) {
    const handle = input.similarToHandle.trim()
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle },
    })
    const current = products?.[0] as { id?: string } | undefined
    if (current?.id) {
      exclude.add(current.id)
      const { data: catLinks } = await query.graph({
        entity: productCategoriesLink.entryPoint,
        fields: ["catalog_category_id"],
        filters: { product_id: current.id },
      })
      const categoryIds = (catLinks ?? [])
        .map((r: { catalog_category_id?: string }) => r.catalog_category_id)
        .filter(Boolean) as string[]

      const currentRow = snapshot.list.find((p) => p.id === current.id)
      for (const c of (currentRow?.categories ?? []) as CategoryRef[]) {
        if (c.slug) categorySlugs.add(c.slug)
      }

      if (categoryIds.length && !categorySlugs.size) {
        // category ids without slugs on snapshot row — filter via snapshot categories only
      }
    }
  }

  let candidates = snapshot.list.filter((p) => {
    const id = p.id as string
    return id && !exclude.has(id)
  })

  if (categorySlugs.size) {
    const filtered = candidates.filter((p) =>
      ((p.categories ?? []) as CategoryRef[]).some(
        (c) => c.slug && categorySlugs.has(c.slug)
      )
    )
    if (filtered.length) {
      candidates = filtered
    }
  }

  if (!candidates.length) {
    candidates = snapshot.list.filter((p) => {
      const id = p.id as string
      return id && !exclude.has(id)
    })
  }

  const ordered = [...candidates].sort((a, b) => {
    const sf = compareBySalesforceOrder(a, b, tieBreakByTitle)
    if (sf !== 0) return sf
    const countDiff =
      (registrationCounts[b.id as string] ?? 0) - (registrationCounts[a.id as string] ?? 0)
    if (countDiff !== 0) return countDiff
    return (
      new Date((b.created_at as string) ?? 0).getTime() -
      new Date((a.created_at as string) ?? 0).getTime()
    )
  })

  return ordered.slice(0, RECOMMENDATION_LIMIT)
}
