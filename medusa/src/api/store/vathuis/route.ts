import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { filterProductsBySearchQuery, sortByRelevanceRank } from "../../../lib/search-query"
import { getVathuisListingSnapshot } from "../../../lib/store-listing-snapshot"
import {
  sortListingBySalesforceOrder,
  tieBreakByTitle,
} from "../../../lib/listing-sort"

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return []
  return (Array.isArray(val) ? val : [val]).flatMap((v) => v.split(",")).filter(Boolean)
}

function setListingCacheHeaders(res: MedusaResponse): void {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
}

function sortVathuisList(
  list: Record<string, unknown>[],
  sort: string,
  relevanceRank: Map<string, number> | null
): Record<string, unknown>[] {
  if (sort === "relevance" && relevanceRank?.size) {
    return sortByRelevanceRank(list, relevanceRank)
  }

  const sorted = [...list]
  switch (sort) {
    case "order":
      return sortListingBySalesforceOrder(list, tieBreakByTitle)
    case "price_asc":
      sorted.sort(
        (a, b) =>
          ((a.price_from as number) ?? Infinity) - ((b.price_from as number) ?? Infinity)
      )
      break
    case "price_desc":
      sorted.sort((a, b) => ((b.price_from as number) ?? 0) - ((a.price_from as number) ?? 0))
      break
    case "newest":
    default:
      sorted.sort(
        (a, b) =>
          new Date((b.created_at as string) ?? 0).getTime() -
          new Date((a.created_at as string) ?? 0).getTime()
      )
      break
  }
  return sorted
}

function buildVathuisFacets(list: Record<string, unknown>[]) {
  const categoryCounts: Record<string, { slug: string; label: string; count: number }> = {}
  const docentCounts: Record<string, { slug: string; name: string; count: number }> = {}

  for (const product of list) {
    for (const category of (product.categories ?? []) as {
      slug?: string
      label?: string
    }[]) {
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

/**
 * GET /store/vathuis — VAthuis on-demand catalog (excluded from Ons aanbod / Agenda).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const q = req.query
  const searchQ = typeof q.q === "string" ? q.q.trim() : ""
  const categorySlugs = parseArrayParam(q.category as string | string[])
  const docentSlugs = parseArrayParam(q.docent as string | string[])
  const sort = typeof q.sort === "string" ? q.sort : "order"
  const limit = Math.min(Math.max(1, Number(q.limit) || 24), 100)
  const offset = Math.max(0, Number(q.offset) || 0)

  const snapshot = await getVathuisListingSnapshot(req.scope)
  let list = [...snapshot.list]

  if (categorySlugs.length) {
    list = list.filter((p) =>
      ((p.categories ?? []) as { slug?: string }[]).some(
        (c) => c.slug && categorySlugs.includes(c.slug)
      )
    )
  }

  if (docentSlugs.length) {
    list = list.filter((p) =>
      ((p.docenten ?? []) as { slug?: string }[]).some(
        (d) => d.slug && docentSlugs.includes(d.slug)
      )
    )
  }

  let relevanceRank: Map<string, number> | null = null
  if (searchQ) {
    const searchResult = await filterProductsBySearchQuery(req.scope, list, searchQ)
    list = searchResult.list
    relevanceRank = searchResult.rankByProductId
  }

  const facets = buildVathuisFacets(list)
  const count = list.length
  list = sortVathuisList(list, sort, relevanceRank)
  list = list.slice(offset, offset + limit)

  setListingCacheHeaders(res)
  res.json({ items: list, count, facets })
}
