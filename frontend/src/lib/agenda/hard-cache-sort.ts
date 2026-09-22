import type { AgendaFilters } from '@/lib/commerce/types'

/** Unfiltered base agenda sorts served from Next.js hard cache (page 1). */
export type HardCachedAgendaSort = 'start_date' | 'start_date_desc'

export type AgendaListingSort = HardCachedAgendaSort | 'price_asc' | 'price_desc'

export const DEFAULT_AGENDA_SORT: HardCachedAgendaSort = 'start_date'

export function isHardCachedAgendaSort(
  sort: AgendaFilters['sort']
): sort is HardCachedAgendaSort {
  return sort === 'start_date' || sort === 'start_date_desc'
}

/** Agenda stays chronological (or price). Search never switches to relevance. */
export function resolveAgendaSort(sort?: AgendaFilters['sort']): AgendaListingSort {
  if (sort === 'start_date_desc' || sort === 'price_asc' || sort === 'price_desc') {
    return sort
  }
  return DEFAULT_AGENDA_SORT
}
