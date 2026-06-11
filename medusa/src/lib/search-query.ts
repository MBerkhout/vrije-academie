import type { MedusaContainer } from "@medusajs/framework/types"

import SearchModuleService from "../modules/search/service"
import { productMatchesQuery } from "../modules/search/in-memory-search"

export async function filterProductsBySearchQuery(
  scope: MedusaContainer,
  list: Record<string, unknown>[],
  searchQ: string
): Promise<{ list: Record<string, unknown>[]; rankByProductId: Map<string, number> | null }> {
  const trimmed = searchQ.trim()
  if (!trimmed) {
    return { list, rankByProductId: null }
  }

  const search = scope.resolve("search") as InstanceType<typeof SearchModuleService>

  if (search.isEnabled()) {
    try {
      const rankedIds = await search.searchRankedProductIds(trimmed)
      const idSet = new Set(rankedIds)
      const rankByProductId = new Map(rankedIds.map((id, index) => [id, index]))
      const filtered = list.filter((p) => idSet.has(String(p.id)))
      filtered.sort(
        (a, b) =>
          (rankByProductId.get(String(a.id)) ?? Infinity) -
          (rankByProductId.get(String(b.id)) ?? Infinity)
      )
      return { list: filtered, rankByProductId }
    } catch {
      // Fall through to in-memory search when OpenSearch is unreachable.
    }
  }

  return {
    list: list.filter((p) => productMatchesQuery(p, trimmed)),
    rankByProductId: null,
  }
}

export function sortByRelevanceRank(
  list: Record<string, unknown>[],
  rankByProductId: Map<string, number> | null
): Record<string, unknown>[] {
  if (!rankByProductId?.size) return list
  return [...list].sort(
    (a, b) =>
      (rankByProductId.get(String(a.id)) ?? Infinity) -
      (rankByProductId.get(String(b.id)) ?? Infinity)
  )
}
