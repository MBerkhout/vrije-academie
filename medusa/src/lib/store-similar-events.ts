import type { MedusaContainer } from "@medusajs/framework/types"

import { shuffleInPlace } from "./event-session-eligibility"
import {
  sortListingBySalesforceOrder,
  tieBreakEventsByStartThenTitle,
} from "./listing-sort"
import {
  getPlpListingSnapshot,
  getRegistrationCountsByProduct,
} from "./store-listing-snapshot"

const SIMILAR_LIMIT = 4

/** Card-shaped row for similar courses (no heavy variant trees). */
function toSimilarCard(row: Record<string, unknown>): Record<string, unknown> {
  const {
    variants: _variants,
    properties: _properties,
    metadata: _metadata,
    tags: _tags,
    ...rest
  } = row
  return rest
}

/**
 * Similar products in shared catalog categories — derived from the PLP snapshot
 * (fast) instead of loading every sibling with full variant graphs from Postgres.
 */
export async function buildSimilarEventsFromSnapshot(
  scope: MedusaContainer,
  handle: string
): Promise<Record<string, unknown>[]> {
  const [snapshot, registrationCounts] = await Promise.all([
    getPlpListingSnapshot(scope),
    getRegistrationCountsByProduct(scope),
  ])

  const current = snapshot.list.find((p) => (p.handle as string) === handle)
  if (!current) return []

  const categorySlugs = new Set(
    ((current.categories ?? []) as { slug?: string }[])
      .map((c) => c.slug)
      .filter(Boolean) as string[]
  )
  if (!categorySlugs.size) return []

  const candidates = snapshot.list.filter((p) => {
    if ((p.handle as string) === handle) return false
    return ((p.categories ?? []) as { slug?: string }[]).some(
      (c) => c.slug && categorySlugs.has(c.slug)
    )
  })

  if (!candidates.length) return []

  const maxCount = Math.max(...candidates.map((p) => registrationCounts[p.id as string] ?? 0))
  const usePopularitySort = maxCount > 0

  let ordered: Record<string, unknown>[]
  if (usePopularitySort) {
    ordered = [...candidates].sort((a, b) => {
      const countDiff =
        (registrationCounts[b.id as string] ?? 0) - (registrationCounts[a.id as string] ?? 0)
      if (countDiff !== 0) return countDiff
      return tieBreakEventsByStartThenTitle(a, b)
    })
  } else {
    ordered = shuffleInPlace([...candidates])
  }

  return ordered.slice(0, SIMILAR_LIMIT).map(toSimilarCard)
}
