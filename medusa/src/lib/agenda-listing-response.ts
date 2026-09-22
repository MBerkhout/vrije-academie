import type { AgendaOccurrenceRow } from "./store-listing-snapshot"

/** True when an occurrence start is still in the future (or exactly now). */
export function isFutureAgendaStartAt(startAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!startAt) return false
  return new Date(startAt).getTime() >= nowMs
}

/** Drop facet-only fields before sending agenda rows to the storefront. */
export function slimAgendaItemForResponse(
  item: AgendaOccurrenceRow & { status?: string }
): Record<string, unknown> {
  const {
    categories: _categories,
    docenten: _docenten,
    tags: _tags,
    ...rest
  } = item
  return rest
}
