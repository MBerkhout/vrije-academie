import 'server-only'

import { unstable_cache } from 'next/cache'

import { medusaClient } from '@/lib/commerce/medusa-client'
import type { AgendaListResult } from '@/lib/commerce/types'
import { PAGE_SIZE } from '@/app/(main)/agenda/_state/url'
import type { HardCachedAgendaSort } from '@/lib/agenda/hard-cache-sort'

/** Matches Medusa `LISTING_CACHE_TTL_SEC` (10 minutes). */
export const AGENDA_HARD_CACHE_SEC = 600

export const AGENDA_DEFAULT_CACHE_TAG = 'agenda-default'

export type { HardCachedAgendaSort } from '@/lib/agenda/hard-cache-sort'

/**
 * Hard SSR cache for unfiltered `/agenda` (default sort, page 1).
 * Busted via `revalidateTag(AGENDA_DEFAULT_CACHE_TAG)` when listing snapshots change.
 */
export const getHardCachedDefaultAgendaListing = unstable_cache(
  async (): Promise<AgendaListResult> =>
    medusaClient.getAgendaPaginated({
      sort: 'start_date',
      limit: PAGE_SIZE,
      offset: 0,
    }),
  ['agenda-default-listing-v1'],
  { revalidate: AGENDA_HARD_CACHE_SEC, tags: [AGENDA_DEFAULT_CACHE_TAG] }
)

/** Hard SSR cache for unfiltered `/agenda?sort=start_date_desc` (page 1). */
export const getHardCachedStartDateDescAgendaListing = unstable_cache(
  async (): Promise<AgendaListResult> =>
    medusaClient.getAgendaPaginated({
      sort: 'start_date_desc',
      limit: PAGE_SIZE,
      offset: 0,
    }),
  ['agenda-start-date-desc-listing-v1'],
  { revalidate: AGENDA_HARD_CACHE_SEC, tags: [AGENDA_DEFAULT_CACHE_TAG] }
)

export function getHardCachedAgendaListing(sort: HardCachedAgendaSort): Promise<AgendaListResult> {
  return sort === 'start_date_desc'
    ? getHardCachedStartDateDescAgendaListing()
    : getHardCachedDefaultAgendaListing()
}
