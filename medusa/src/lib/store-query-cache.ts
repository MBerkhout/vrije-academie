/**
 * Lightweight in-memory TTL cache for the heavy base queries in
 * /store/events and /store/agenda.
 *
 * Both routes fetch the full product catalog + all EventGroup links on every
 * request. These rarely change (only when an admin publishes or edits a
 * product), so caching them for 60 s cuts most of the per-request DB work.
 *
 * Usage:
 *   const { allProducts, eventGroupLinks } = await getBaseEventData(query)
 */

import type { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QueryService = ReturnType<
  Parameters<typeof import("@medusajs/framework/http").MedusaRequest.prototype.scope.resolve>[0] extends never
    ? never
    : any
>

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
