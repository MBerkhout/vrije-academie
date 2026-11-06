import type { MedusaContainer } from "@medusajs/framework/types"

import { isSalesforceExterneVerhuur } from "./salesforce-visible-on-website"
import { mergeVathuisIntoPlpList } from "./merge-vathuis-into-plp"
import {
  getPlpListingSnapshot,
  getVathuisListingSnapshot,
} from "./store-listing-snapshot"

/** Productkaarten blocks allow up to 4 refs; allow headroom for API callers. */
export const EVENTS_BY_HANDLES_MAX = 8

/** PLP card shape — omit heavy variant trees from listing snapshot rows. */
export function toListingEventCard(row: Record<string, unknown>): Record<string, unknown> {
  const {
    variants: _variants,
    properties: _properties,
    metadata: _metadata,
    tags: _tags,
    ...rest
  } = row
  return rest
}

function normalizeHandleParam(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Resolve handpicked CMS product handles to listing snapshot rows (Ons aanbod rules).
 * Preserves caller order; omits handles not present in the snapshot (expired / ineligible).
 */
export async function buildEventsByHandlesFromSnapshot(
  scope: MedusaContainer,
  handles: string[]
): Promise<Record<string, unknown>[]> {
  const ordered = [
    ...new Set(
      handles
        .map(normalizeHandleParam)
        .filter(Boolean)
        .slice(0, EVENTS_BY_HANDLES_MAX)
    ),
  ]
  if (!ordered.length) return []

  const [plpSnapshot, vathuisSnapshot] = await Promise.all([
    getPlpListingSnapshot(scope),
    getVathuisListingSnapshot(scope),
  ])

  let list = [...plpSnapshot.list].filter(
    (p) =>
      !isSalesforceExterneVerhuur(
        p.title as string | undefined,
        p.record_type as string | undefined
      )
  )
  list = mergeVathuisIntoPlpList(list, vathuisSnapshot.list)

  const byHandle = new Map<string, Record<string, unknown>>()
  for (const row of list) {
    const handle = typeof row.handle === "string" ? normalizeHandleParam(row.handle) : ""
    if (handle && !byHandle.has(handle)) {
      byHandle.set(handle, row)
    }
  }

  const events: Record<string, unknown>[] = []
  for (const handle of ordered) {
    const row = byHandle.get(handle)
    if (row) events.push(toListingEventCard(row))
  }
  return events
}
