import type { AgendaOccurrenceRow } from "./store-listing-snapshot"

const AGENDA_TIME_ZONE = "Europe/Amsterdam"

/** Calendar date `YYYY-MM-DD` for an ISO timestamp in Europe/Amsterdam. */
export function agendaLocalDateYmd(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AGENDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}

/** True when start and end fall on the same calendar day in Europe/Amsterdam. */
export function agendaOccurrenceSameCalendarDay(
  startAt: string | null | undefined,
  endAt: string | null | undefined
): boolean {
  if (!startAt || !endAt) return false
  const startYmd = agendaLocalDateYmd(startAt)
  const endYmd = agendaLocalDateYmd(endAt)
  return !!startYmd && startYmd === endYmd
}

export type AgendaOccurrenceEligibility = Pick<
  AgendaOccurrenceRow,
  "start_at" | "end_at" | "record_type" | "delivery_type"
>

/**
 * Agenda overview rows: single-day sessions only; exclude VA-thuis (semantic types).
 */
export function isAgendaOccurrenceEligible(it: AgendaOccurrenceEligibility): boolean {
  if (it.record_type === "vathuis") return false
  if (it.delivery_type === "pre_recorded") return false
  return agendaOccurrenceSameCalendarDay(it.start_at, it.end_at)
}

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
