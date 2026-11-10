import type { EventCard } from '@/lib/commerce/types'
import { commerceClient } from '@/lib/commerce'

export interface ResolveProductRowEventsOptions {
  /** Default true — omit products not on Ons aanbod (no upcoming session). */
  hideWithoutUpcomingSessions?: boolean
  /** Server-only: share one by-handles request across all blocks of a page render. */
  batchRequests?: boolean
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase()
}

/**
 * Resolve Productkaarten carousel events: listing snapshot batch first;
 * optional PDP detail fetch for archive handpicks when filtering is off.
 */
export async function resolveProductRowEvents(
  handles: string[],
  options?: ResolveProductRowEventsOptions,
): Promise<EventCard[]> {
  const ordered = [...new Set(handles.map(normalizeHandle).filter(Boolean))].slice(0, 8)
  if (ordered.length === 0) return []

  const hideWithoutUpcomingSessions = options?.hideWithoutUpcomingSessions !== false

  const fetchListing = options?.batchRequests
    ? (await import('./batched-events-by-handles')).getEventsByHandlesBatched
    : commerceClient.getEventsByHandles.bind(commerceClient)
  const fromListing = await fetchListing(ordered).catch(() => [] as EventCard[])

  if (hideWithoutUpcomingSessions) {
    return ordered
      .map((h) => fromListing.find((e) => normalizeHandle(e.handle ?? '') === h))
      .filter((e): e is EventCard => e != null)
  }

  const byHandle = new Map<string, EventCard>()
  for (const event of fromListing) {
    const key = normalizeHandle(event.handle ?? '')
    if (key) byHandle.set(key, event)
  }

  const missing = ordered.filter((h) => !byHandle.has(h))
  if (missing.length > 0) {
    const details = await Promise.all(
      missing.map((handle) => commerceClient.getEvent(handle).catch(() => null)),
    )
    for (const event of details) {
      if (!event) continue
      const key = normalizeHandle(event.handle ?? '')
      if (key) byHandle.set(key, event)
    }
  }

  return ordered.map((h) => byHandle.get(h)).filter((e): e is EventCard => e != null)
}
