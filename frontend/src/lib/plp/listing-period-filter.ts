/** YYYY-MM for a calendar month (1–12). */
export function listingMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export const LISTING_PERIOD_MONTH_LABELS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mrt' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Okt' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
] as const

export const LISTING_VOORJAAR_MONTHS = [1, 2, 3, 4, 5, 6]
export const LISTING_NAJAAR_MONTHS = [7, 8, 9, 10, 11, 12]

export function listingPeriodSeasonRange(
  year: number,
  season: 'voorjaar' | 'najaar',
): { start: string; end: string } {
  if (season === 'voorjaar') return { start: `${year}-01-01`, end: `${year}-06-30` }
  return { start: `${year}-07-01`, end: `${year}-12-31` }
}

export function lastDayOfListingMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function listingMonthDateRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const pad = String(month).padStart(2, '0')
  const last = String(lastDayOfListingMonth(year, month)).padStart(2, '0')
  return { start: `${year}-${pad}-01`, end: `${year}-${pad}-${last}` }
}

export function parseListingMonthKey(slug: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(slug)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || month < 1 || month > 12) return null
  return { year, month }
}

/**
 * Whether a period-filter month should be shown.
 * Past months and months with no future activities are hidden, unless they are
 * currently selected (so the user can still deselect them).
 */
export function isListingPeriodMonthVisible(opts: {
  year: number
  month: number
  now?: Date
  count?: number
  selected?: boolean
}): boolean {
  if (opts.selected) return true
  const now = opts.now ?? new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  if (opts.year < currentYear) return false
  if (opts.year === currentYear && opts.month < currentMonth) return false
  if (opts.count != null && opts.count <= 0) return false
  return true
}

export function isListingSeasonVisible(opts: {
  months: number[]
  year: number
  now?: Date
  monthCount?: (month: number) => number | undefined
  selected?: boolean
}): boolean {
  if (opts.selected) return true
  return opts.months.some((month) =>
    isListingPeriodMonthVisible({
      year: opts.year,
      month,
      now: opts.now,
      count: opts.monthCount?.(month),
    }),
  )
}

export type ListingPeriodSelection =
  | { kind: 'month'; month: number }
  | { kind: 'season'; season: 'voorjaar' | 'najaar' }
  | { kind: 'range' }

/** Month or voorjaar/najaar selections ignore the year in the URL. */
export function parseListingPeriodSelection(
  periodStart?: string,
  periodEnd?: string,
): ListingPeriodSelection | null {
  if (!periodStart && !periodEnd) return null
  if (!periodStart || !periodEnd) return { kind: 'range' }
  const start = parseListingMonthKey(periodStart.slice(0, 7))
  const end = parseListingMonthKey(periodEnd.slice(0, 7))
  if (!start || !end || start.year !== end.year) return { kind: 'range' }
  if (periodStart.endsWith('-01-01') && periodEnd.endsWith('-06-30')) {
    return { kind: 'season', season: 'voorjaar' }
  }
  if (periodStart.endsWith('-07-01') && periodEnd.endsWith('-12-31')) {
    return { kind: 'season', season: 'najaar' }
  }
  if (start.month === end.month) return { kind: 'month', month: start.month }
  return { kind: 'range' }
}

export function listingPeriodChipLabel(periodStart?: string, periodEnd?: string): string {
  const selection = parseListingPeriodSelection(periodStart, periodEnd)
  if (selection?.kind === 'season') {
    return selection.season === 'voorjaar' ? 'Voorjaar' : 'Najaar'
  }
  if (selection?.kind === 'month') {
    return LISTING_PERIOD_MONTH_LABELS[selection.month - 1]?.label ?? 'Periode'
  }
  return 'Periode'
}

export function listingPeriodSelectionDates(
  selection: Exclude<ListingPeriodSelection, { kind: 'range' }>,
  year = new Date().getFullYear(),
): { start: string; end: string } {
  if (selection.kind === 'season') return listingPeriodSeasonRange(year, selection.season)
  return listingMonthDateRange(year, selection.month)
}

function isCalendarMonthVisible(opts: {
  month: number
  now: Date
  monthCounts?: Record<string, number>
  selected?: boolean
}): boolean {
  if (opts.selected) return true
  const counts = opts.monthCounts
  if (!counts) {
    return opts.month >= opts.now.getMonth() + 1
  }
  for (const [slug, count] of Object.entries(counts)) {
    if (count <= 0) continue
    const parsed = parseListingMonthKey(slug)
    if (parsed?.month !== opts.month) continue
    if (isListingPeriodMonthVisible({ year: parsed.year, month: opts.month, now: opts.now, count })) {
      return true
    }
  }
  return false
}

export type ListingPeriodControls = {
  seasons: { key: 'voorjaar' | 'najaar'; selected: boolean }[]
  months: { value: number; label: string; selected: boolean }[]
}

/** One Voorjaar/Najaar row and one month grid; a month is listed if any year still has sessions. */
export function listingPeriodControls(opts: {
  monthCounts?: Record<string, number>
  periodStart?: string
  periodEnd?: string
  now?: Date
}): ListingPeriodControls {
  const now = opts.now ?? new Date()
  const selection = parseListingPeriodSelection(opts.periodStart, opts.periodEnd)
  const selectedMonth = selection?.kind === 'month' ? selection.month : null
  const selectedSeason = selection?.kind === 'season' ? selection.season : null

  const seasons = (
    [
      { key: 'voorjaar' as const, months: LISTING_VOORJAAR_MONTHS },
      { key: 'najaar' as const, months: LISTING_NAJAAR_MONTHS },
    ] as const
  )
    .filter((season) =>
      season.months.some((month) =>
        isCalendarMonthVisible({
          month,
          now,
          monthCounts: opts.monthCounts,
          selected: selectedMonth === month || selectedSeason === season.key,
        }),
      ),
    )
    .map((season) => ({
      key: season.key,
      selected: selectedSeason === season.key,
    }))

  const months = LISTING_PERIOD_MONTH_LABELS.filter((month) =>
    isCalendarMonthVisible({
      month: month.value,
      now,
      monthCounts: opts.monthCounts,
      selected: selectedMonth === month.value,
    }),
  ).map((month) => ({
    value: month.value,
    label: month.label,
    selected: selectedMonth === month.value,
  }))

  return { seasons, months }
}
