import 'server-only'

import { unstable_cache } from 'next/cache'

import { medusaClient } from '@/lib/commerce/medusa-client'
import type { EventListResult } from '@/lib/commerce/types'
import { PAGE_SIZE } from '@/app/(main)/ons-aanbod/_state/url'

/** Matches Medusa `LISTING_CACHE_TTL_SEC` (10 minutes). */
export const PLP_HARD_CACHE_SEC = 600

export const PLP_DEFAULT_CACHE_TAG = 'plp-default'

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
