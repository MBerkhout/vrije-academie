import type { VathuisFilters } from '@/lib/commerce/types'
import type { ReadonlyURLSearchParams } from 'next/navigation'

export type VathuisFilterState = Omit<VathuisFilters, 'limit' | 'offset'>

export const VATHUIS_PAGE_SIZE = 24

export function parseVathuisFilterState(
  params: URLSearchParams | ReadonlyURLSearchParams | Record<string, string | string[]>
): VathuisFilterState {
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
    sort: (get('sort') as VathuisFilterState['sort']) || undefined,
    categories: getAll('category'),
    teachers: getAll('docent'),
  }
}

export function serializeVathuisFilterState(state: VathuisFilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q) p.set('q', state.q)
  if (state.sort) p.set('sort', state.sort)
  for (const v of state.categories ?? []) p.append('category', v)
  for (const v of state.teachers ?? []) p.append('docent', v)
  return p
}

export function hasActiveVathuisFilters(state: VathuisFilterState): boolean {
  return !!(state.q || state.categories?.length || state.teachers?.length)
}

export function removeVathuisFilter(
  state: VathuisFilterState,
  key: keyof VathuisFilterState,
  value?: string
): VathuisFilterState {
  if (typeof state[key] === 'string') {
    return { ...state, [key]: undefined }
  }
  if (Array.isArray(state[key]) && value) {
    return { ...state, [key]: (state[key] as string[]).filter((v) => v !== value) }
  }
  return { ...state, [key]: undefined }
}

export function clearVathuisFilters(): VathuisFilterState {
  return {}
}
