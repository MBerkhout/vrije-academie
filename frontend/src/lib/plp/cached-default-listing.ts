import 'server-only'

import { unstable_cache } from 'next/cache'

import { medusaClient } from '@/lib/commerce/medusa-client'
import type { EventListResult, PaginatedEventFilters } from '@/lib/commerce/types'
import { PAGE_SIZE } from '@/app/(main)/ons-aanbod/_state/url'

/** Matches Medusa `LISTING_CACHE_TTL_SEC` (10 minutes). */
export const PLP_HARD_CACHE_SEC = 600

export const PLP_DEFAULT_CACHE_TAG = 'plp-default'

/** Unfiltered base PLP sorts served from Next.js hard cache (page 1). */
export type HardCachedPlpSort = 'order' | 'start_date'

/**
 * Hard SSR cache for unfiltered `/ons-aanbod` (default sort, page 1).
 * Busted via `revalidateTag(PLP_DEFAULT_CACHE_TAG)` when top-of-list products change.
 */
export const getHardCachedDefaultPlpListing = unstable_cache(
  async (): Promise<EventListResult> =>
    medusaClient.getEventsPaginated({
      sort: 'order',
      limit: PAGE_SIZE,
      offset: 0,
    }),
  ['plp-default-listing-v1'],
  { revalidate: PLP_HARD_CACHE_SEC, tags: [PLP_DEFAULT_CACHE_TAG] }
)

/** Hard SSR cache for unfiltered `/ons-aanbod?sort=start_date` (page 1). */
export const getHardCachedStartDatePlpListing = unstable_cache(
  async (): Promise<EventListResult> =>
    medusaClient.getEventsPaginated({
      sort: 'start_date',
      limit: PAGE_SIZE,
      offset: 0,
    }),
  ['plp-start-date-listing-v1'],
  { revalidate: PLP_HARD_CACHE_SEC, tags: [PLP_DEFAULT_CACHE_TAG] }
)

export function getHardCachedPlpListing(sort: HardCachedPlpSort): Promise<EventListResult> {
  return sort === 'start_date'
    ? getHardCachedStartDatePlpListing()
    : getHardCachedDefaultPlpListing()
}

export function isHardCachedPlpSort(
  sort: PaginatedEventFilters['sort']
): sort is HardCachedPlpSort {
  return sort === 'order' || sort === 'start_date'
}
