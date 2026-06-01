/**
 * Dutch storefront formatting (dates, times, money).
 * Import from `@/lib/locale-format` instead of duplicating Intl options per component.
 */

export const LOCALE_NL = 'nl-NL' as const

const MONTHS_NL_LONG = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const

export type PriceEurMode = 'whole' | 'standard'

/**
 * Format minor currency units (cents) as EUR.
 * - `whole` — no fraction digits (e.g. PDP/PLP “Vanaf € 50”)
 * - `standard` — locale default, usually two decimals (cart, checkout, orders)
 */
export function formatPriceEur(cents: number, mode: PriceEurMode = 'standard'): string {
  if (mode === 'whole') {
    return new Intl.NumberFormat(LOCALE_NL, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }
  return new Intl.NumberFormat(LOCALE_NL, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function toDate(iso: string | Date): Date {
  return typeof iso === 'string' ? new Date(iso) : iso
}

/** e.g. `15 dec. 2025` — PLP cards, cart lines */
export function formatDateShort(iso: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE_NL, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(toDate(iso))
}

/** e.g. `ma 15 december 2025` — PDP session tables */
export function formatDateWeekdayLong(iso: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE_NL, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toDate(iso))
}

/** e.g. `14:30` */
export function formatTime(iso: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE_NL, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(iso))
}

/** `formatDateShort` or `null` if input missing */
export function formatDateShortOrNull(iso: string | null | undefined): string | null {
  if (!iso) return null
  return formatDateShort(iso)
}

/** `formatTime` or `null` if input missing */
export function formatTimeOrNull(iso: string | null | undefined): string | null {
  if (!iso) return null
  return formatTime(iso)
}

export interface FormatTimeRangeOptions {
  /** Between start and end. Default ` – ` (PDP); use ` tot ` for cart copy. */
  separator?: string
}

/**
 * Time span for one session row, e.g. `14:00 – 16:30`.
 * If `endIso` is missing, returns only the start time.
 */
export function formatTimeRange(
  startIso: string | Date,
  endIso: string | Date | null | undefined,
  options?: FormatTimeRangeOptions
): string {
  const sep = options?.separator ?? ' – '
  const start = formatTime(startIso)
  if (!endIso) return start
  return `${start}${sep}${formatTime(endIso)}`
}

/**
 * Format `YYYY-MM-DD` as `d monthname yyyy` in Dutch without UTC shifting
 * (for agenda filter chips and similar).
 */
export function formatDateFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const month = MONTHS_NL_LONG[m - 1]
  if (!month) return ymd
  return `${d} ${month} ${y}`
}
