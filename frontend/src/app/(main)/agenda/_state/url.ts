import type { AgendaFilters } from '@/lib/commerce/types'
import type { ReadonlyURLSearchParams } from 'next/navigation'

export type AgendaFilterState = Omit<AgendaFilters, 'limit' | 'offset'>

const PAGE_SIZE = 30

/**
 * Parse URL searchParams into a typed Agenda filter state.
 * Mirrors the PLP filter shape but adds a single-day `date` filter.
 */
export function parseFilterState(
  params: URLSearchParams | ReadonlyURLSearchParams | Record<string, string | string[]>
): AgendaFilterState {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams || 'get' in params) {
      return (params as URLSearchParams).get(key) ?? undefined
    }
    const v = (params as Record<string, string | string[]>)[key]
    return Array.isArray(v) ? v[0] : v
  }

  const getAll = (key: string): string[] => {
    if (params instanceof URLSearchParams || 'getAll' in params) {
      return (params as URLSearchParams).getAll(key)
    }
    const v = (params as Record<string, string | string[]>)[key]
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  return {
    q: get('q') || undefined,
    sort: (get('sort') as AgendaFilterState['sort']) || undefined,
    categories: getAll('category'),
    teachers: getAll('docent'),
    recordTypes: getAll('record_type'),
    deliveryTypes: getAll('delivery_type'),
    cities: getAll('city'),
    dayParts: getAll('day_part'),
    periodStart: get('period_start') || undefined,
    periodEnd: get('period_end') || undefined,
    date: get('date') || undefined,
  }
}

/** Serialize an AgendaFilterState back into URLSearchParams. */
export function serializeFilterState(state: AgendaFilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q) p.set('q', state.q)
  if (state.sort) p.set('sort', state.sort)
  for (const v of state.categories ?? []) p.append('category', v)
  for (const v of state.teachers ?? []) p.append('docent', v)
  for (const v of state.recordTypes ?? []) p.append('record_type', v)
  for (const v of state.deliveryTypes ?? []) p.append('delivery_type', v)
  for (const v of state.cities ?? []) p.append('city', v)
  for (const v of state.dayParts ?? []) p.append('day_part', v)
  if (state.periodStart) p.set('period_start', state.periodStart)
  if (state.periodEnd) p.set('period_end', state.periodEnd)
  if (state.date) p.set('date', state.date)
  return p
}

export function hasActiveFilters(state: AgendaFilterState): boolean {
  return !!(
    state.q ||
    state.categories?.length ||
    state.teachers?.length ||
    state.recordTypes?.length ||
    state.deliveryTypes?.length ||
    state.cities?.length ||
    state.dayParts?.length ||
    state.periodStart ||
    state.periodEnd ||
    state.date
  )
}

export function removeFilter(
  state: AgendaFilterState,
  key: keyof AgendaFilterState,
  value?: string
): AgendaFilterState {
  if (typeof state[key] === 'string') {
    return { ...state, [key]: undefined }
  }
  if (Array.isArray(state[key]) && value) {
    return { ...state, [key]: (state[key] as string[]).filter((v) => v !== value) }
  }
  return { ...state, [key]: undefined }
}

export function clearFilters(): AgendaFilterState {
  return {}
}

export { PAGE_SIZE }
