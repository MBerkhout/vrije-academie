import 'server-only'

import { unstable_cache } from 'next/cache'

import { medusaClient } from '@/lib/commerce/medusa-client'
import type { EventCard } from '@/lib/commerce/types'

/** Matches Medusa `EVENT_DETAIL_FRESHNESS_TTL_SEC` / listing TTL (default 120 s). */
export const PDP_MEDUSA_CACHE_SEC = Number(process.env.PDP_MEDUSA_CACHE_SEC) || 60

export function pdpEventTag(handle: string): string {
  return `pdp:${handle}`
}

export function pdpSimilarTag(handle: string): string {
  return `pdp-similar:${handle}`
}

function normalizeHandle(handle: string): string {
  return handle.trim()
}

export async function getSharedCachedEvent(handle: string): Promise<EventCard | null> {
  const safe = normalizeHandle(handle)
  if (!safe) return null
  return unstable_cache(
    async () => medusaClient.getEvent(safe),
    ['pdp-event-v1', safe],
    { revalidate: PDP_MEDUSA_CACHE_SEC, tags: [pdpEventTag(safe)] }
  )()
}

export async function getSharedCachedSimilarEvents(handle: string): Promise<EventCard[]> {
  const safe = normalizeHandle(handle)
  if (!safe) return []
  return unstable_cache(
    async () => medusaClient.getSimilarEvents(safe).catch(() => []),
    ['pdp-similar-v1', safe],
    { revalidate: PDP_MEDUSA_CACHE_SEC, tags: [pdpSimilarTag(safe)] }
  )()
}
