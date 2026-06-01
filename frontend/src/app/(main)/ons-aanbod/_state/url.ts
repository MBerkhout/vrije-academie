import type { PaginatedEventFilters } from '@/lib/commerce/types'
import type { ReadonlyURLSearchParams } from 'next/navigation'

export type PlpFilterState = Omit<PaginatedEventFilters, 'limit' | 'offset'>

const PAGE_SIZE = 24

/**
 * Parse URL searchParams into a typed filter state.
 */
export function parseFilterState(
  params: URLSearchParams | ReadonlyURLSearchParams | Record<string, string | string[]>
): PlpFilterState {
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
    sort: (get('sort') as PlpFilterState['sort']) || undefined,
    categories: getAll('category'),
    teachers: getAll('docent'),
    recordTypes: getAll('record_type'),
    productTypes: getAll('product_type'),
    deliveryTypes: getAll('delivery_type'),
    cities: getAll('city'),
    dayParts: getAll('day_part'),
    periodStart: get('period_start') || undefined,
    periodEnd: get('period_end') || undefined,
  }
}

/**
 * Serialize a filter state back into URLSearchParams.
 */
export function serializeFilterState(state: PlpFilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q) p.set('q', state.q)
  if (state.sort) p.set('sort', state.sort)
  for (const v of state.categories ?? []) p.append('category', v)
  for (const v of state.teachers ?? []) p.append('docent', v)
  for (const v of state.recordTypes ?? []) p.append('record_type', v)
  for (const v of state.productTypes ?? []) p.append('product_type', v)
  for (const v of state.deliveryTypes ?? []) p.append('delivery_type', v)
  for (const v of state.cities ?? []) p.append('city', v)
  for (const v of state.dayParts ?? []) p.append('day_part', v)
  if (state.periodStart) p.set('period_start', state.periodStart)
  if (state.periodEnd) p.set('period_end', state.periodEnd)
  return p
}

export function hasActiveFilters(state: PlpFilterState): boolean {
  return !!(
    state.q ||
    state.categories?.length ||
    state.teachers?.length ||
    state.recordTypes?.length ||
    state.productTypes?.length ||
    state.deliveryTypes?.length ||
    state.cities?.length ||
    state.dayParts?.length ||
    state.periodStart ||
    state.periodEnd
  )
}

export function removeFilter(
  state: PlpFilterState,
  key: keyof PlpFilterState,
  value?: string
): PlpFilterState {
  if (typeof state[key] === 'string') {
    return { ...state, [key]: undefined }
  }
  if (Array.isArray(state[key]) && value) {
    return { ...state, [key]: (state[key] as string[]).filter((v) => v !== value) }
  }
  return { ...state, [key]: undefined }
}

export function clearFilters(): PlpFilterState {
  return {}
}

export { PAGE_SIZE }
