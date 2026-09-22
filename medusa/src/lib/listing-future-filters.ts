import { cityRefFromEventItem, type CityRef } from "./city-refs"
import { citySlugFromLabel } from "./city-slug"
import {
  isFutureSession,
  type EventItemListingRow,
  type EventItemSessionRow,
} from "./event-session-eligibility"

export type ListingSessionFilters = {
  citySlugs: string[]
  dayParts: string[]
  periodStart: string | null
  periodEnd: string | null
}

const EMPTY_CITY_LABELS = new Map<string, string>()

export function listingSessionFiltersActive(filters: ListingSessionFilters): boolean {
  return Boolean(
    filters.citySlugs.length ||
      filters.dayParts.length ||
      filters.periodStart ||
      filters.periodEnd
  )
}

export function listingSessionFiltersOmitting(
  filters: ListingSessionFilters,
  omit: "city" | "day_part" | "period"
): ListingSessionFilters {
  if (omit === "city") return { ...filters, citySlugs: [] }
  if (omit === "day_part") return { ...filters, dayParts: [] }
  return { ...filters, periodStart: null, periodEnd: null }
}

export function sessionCitySlug(ei: EventItemListingRow): string | null {
  const slug = ei.city_slug?.trim() || (ei.city?.trim() ? citySlugFromLabel(ei.city) : "")
  return slug || null
}

/** Session day-part in the process local timezone (Europe/Amsterdam on store hosts). */
export function dayPartFromStartAt(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const hour = new Date(startAt).getHours()
  if (hour < 12) return "ochtend"
  if (hour < 17) return "middag"
  return "avond"
}

export function monthKeyFromStartAt(startAt: string | null | undefined): string | null {
  if (!startAt) return null
  const d = new Date(startAt)
  if (Number.isNaN(d.getTime())) return null
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${d.getFullYear()}-${month}`
}

function periodEndInclusiveMs(periodEnd: string): number | null {
  const to = new Date(periodEnd).getTime()
  if (Number.isNaN(to)) return null
  // Date-only `YYYY-MM-DD` is midnight at the start of that day — include the whole day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return to + 24 * 60 * 60 * 1000 - 1
  }
  return to
}

type ListingPeriodSelection =
  | { kind: "month"; month: number }
  | { kind: "season"; season: "voorjaar" | "najaar" }
  | { kind: "range" }

function parseListingPeriodSelection(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined
): ListingPeriodSelection | null {
  if (!periodStart && !periodEnd) return null
  if (!periodStart || !periodEnd) return { kind: "range" }
  const start = /^(\d{4})-(\d{2})/.exec(periodStart)
  const end = /^(\d{4})-(\d{2})/.exec(periodEnd)
  if (!start || !end || start[1] !== end[1]) return { kind: "range" }
  if (periodStart.endsWith("-01-01") && periodEnd.endsWith("-06-30")) {
    return { kind: "season", season: "voorjaar" }
  }
  if (periodStart.endsWith("-07-01") && periodEnd.endsWith("-12-31")) {
    return { kind: "season", season: "najaar" }
  }
  if (start[2] === end[2]) return { kind: "month", month: Number(start[2]) }
  return { kind: "range" }
}

/** Inclusive [periodStart, periodEnd end-of-day] against a dated session start.
 *  A single month or voorjaar/najaar matches that calendar period in every year. */
export function sessionStartInPeriod(
  startAt: string | null | undefined,
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined
): boolean {
  if (!startAt) return false
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) return false
  const selection = parseListingPeriodSelection(periodStart, periodEnd)
  if (!selection) return true
  const month = date.getMonth() + 1
  if (selection.kind === "month") return month === selection.month
  if (selection.kind === "season") {
    return selection.season === "voorjaar" ? month <= 6 : month >= 7
  }
  const t = date.getTime()
  if (periodStart) {
    const from = new Date(periodStart).getTime()
    if (!Number.isNaN(from) && t < from) return false
  }
  if (periodEnd) {
    const to = periodEndInclusiveMs(periodEnd)
    if (to != null && t > to) return false
  }
  return true
}

/** One future session must satisfy city, day-part and period together (AND, not independent ORs). */
export function eventItemMatchesSessionFilters(
  ei: EventItemListingRow,
  filters: ListingSessionFilters,
  now: Date = new Date()
): boolean {
  if (!isFutureSession(ei, now.getTime())) return false
  if (filters.citySlugs.length) {
    const slug = sessionCitySlug(ei)
    if (!slug || !filters.citySlugs.includes(slug)) return false
  }
  if (filters.dayParts.length) {
    const dayPart = dayPartFromStartAt(ei.start_at)
    if (!dayPart || !filters.dayParts.includes(dayPart)) return false
  }
  if (filters.periodStart || filters.periodEnd) {
    if (!sessionStartInPeriod(ei.start_at, filters.periodStart, filters.periodEnd)) return false
  }
  return true
}

export function matchingListingSessions(
  eventItems: EventItemListingRow[],
  filters: ListingSessionFilters,
  now: Date = new Date()
): EventItemListingRow[] {
  if (!listingSessionFiltersActive(filters)) {
    const nowMs = now.getTime()
    return eventItems.filter((ei) => isFutureSession(ei, nowMs))
  }
  return eventItems.filter((ei) => eventItemMatchesSessionFilters(ei, filters, now))
}

export function futureEventItemsMatchSessionFilters(
  eventItems: EventItemListingRow[],
  filters: ListingSessionFilters,
  now: Date = new Date()
): boolean {
  if (!listingSessionFiltersActive(filters)) return true
  return eventItems.some((ei) => eventItemMatchesSessionFilters(ei, filters, now))
}

export function earliestMatchingSessionStartAt(
  eventItems: EventItemListingRow[],
  filters: ListingSessionFilters,
  now: Date = new Date()
): string | null {
  const starts = matchingListingSessions(eventItems, filters, now)
    .map((ei) => ei.start_at)
    .filter((start): start is string => Boolean(start))
    .sort()
  return starts[0] ?? null
}

export function uniqueSessionCityRefs(eventItems: EventItemListingRow[]): CityRef[] {
  const seen = new Set<string>()
  const out: CityRef[] = []
  for (const ei of eventItems) {
    const ref = cityRefFromEventItem(ei, EMPTY_CITY_LABELS)
    if (!ref || seen.has(ref.slug)) continue
    seen.add(ref.slug)
    out.push(ref)
  }
  return out
}

/** True when any *future* dated session falls in the selected period. */
export function futureEventItemsMatchPeriod(
  eventItems: EventItemSessionRow[],
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
  now: Date = new Date()
): boolean {
  return futureEventItemsMatchSessionFilters(eventItems, {
    citySlugs: [],
    dayParts: [],
    periodStart: periodStart ?? null,
    periodEnd: periodEnd ?? null,
  }, now)
}

/** True when any *future* dated session has one of the selected day parts. */
export function futureEventItemsMatchDayParts(
  eventItems: EventItemSessionRow[],
  dayParts: string[],
  now: Date = new Date()
): boolean {
  return futureEventItemsMatchSessionFilters(eventItems, {
    citySlugs: [],
    dayParts,
    periodStart: null,
    periodEnd: null,
  }, now)
}

export function uniqueFutureDayParts(
  eventItems: EventItemSessionRow[],
  now: Date = new Date()
): string[] {
  const nowMs = now.getTime()
  const parts = new Set<string>()
  for (const ei of eventItems) {
    if (!isFutureSession(ei, nowMs)) continue
    const dayPart = dayPartFromStartAt(ei.start_at)
    if (dayPart) parts.add(dayPart)
  }
  return [...parts]
}

export function uniqueFutureMonthKeys(
  eventItems: EventItemSessionRow[],
  now: Date = new Date()
): string[] {
  const nowMs = now.getTime()
  const keys = new Set<string>()
  for (const ei of eventItems) {
    if (!ei.start_at || !isFutureSession(ei, nowMs)) continue
    const key = monthKeyFromStartAt(ei.start_at)
    if (key) keys.add(key)
  }
  return [...keys]
}
