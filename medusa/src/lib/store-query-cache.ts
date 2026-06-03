/**
 * Base catalog query cache (product ids + event-group links).
 * Used when building Redis-backed listing snapshots in store-listing-snapshot.ts.
 */

interface BaseEventData {
  allProducts: Array<{ id: string; handle?: string }>
  eventGroupLinks: Array<{ product_id: string; event_group_id: string; event_group: any }>
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

function makeCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null

  return {
    get(): T | null {
      if (entry && Date.now() < entry.expiresAt) return entry.value
      return null
    },
    set(value: T): void {
      entry = { value, expiresAt: Date.now() + ttlMs }
    },
  }
}

const BASE_DATA_TTL_MS = 60_000

const baseDataCache = makeCache<BaseEventData>(BASE_DATA_TTL_MS)

/**
 * Returns all products (id + handle) and all EventGroup links, cached for
 * BASE_DATA_TTL_MS milliseconds. Concurrent first-requests all await the
 * same promise so only one DB round-trip fires at a time.
 */
let inflightBaseData: Promise<BaseEventData> | null = null

export async function getBaseEventData(
  query: any,
  productEventGroupLinkEntryPoint: string
): Promise<BaseEventData> {
  const cached = baseDataCache.get()
  if (cached) return cached

  if (!inflightBaseData) {
    inflightBaseData = (async () => {
      const [{ data: allProducts }, { data: eventGroupLinks }] = await Promise.all([
        query.graph({ entity: "product", fields: ["id", "handle"] }),
        query.graph({
          entity: productEventGroupLinkEntryPoint,
          fields: ["product_id", "event_group_id", "event_group.*"],
        }),
      ])

      const result: BaseEventData = {
        allProducts: (allProducts ?? []) as BaseEventData["allProducts"],
        eventGroupLinks: (eventGroupLinks ?? []) as BaseEventData["eventGroupLinks"],
      }

      baseDataCache.set(result)
      inflightBaseData = null
      return result
    })()
  }

  return inflightBaseData
}
