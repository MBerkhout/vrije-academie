import { describe, expect, it } from 'vitest'

import { isHardCachedAgendaSort, resolveAgendaSort } from './hard-cache-sort'

describe('isHardCachedAgendaSort', () => {
  it('accepts default agenda sorts for hard cache', () => {
    expect(isHardCachedAgendaSort('start_date')).toBe(true)
    expect(isHardCachedAgendaSort('start_date_desc')).toBe(true)
  })

  it('rejects filtered or live-search sorts', () => {
    expect(isHardCachedAgendaSort('relevance')).toBe(false)
    expect(isHardCachedAgendaSort('price_asc')).toBe(false)
    expect(isHardCachedAgendaSort('price_desc')).toBe(false)
    expect(isHardCachedAgendaSort(undefined)).toBe(false)
  })
})

describe('resolveAgendaSort', () => {
  it('defaults to earliest first and ignores relevance', () => {
    expect(resolveAgendaSort(undefined)).toBe('start_date')
    expect(resolveAgendaSort('relevance')).toBe('start_date')
  })

  it('keeps an explicit date or price sort', () => {
    expect(resolveAgendaSort('start_date_desc')).toBe('start_date_desc')
    expect(resolveAgendaSort('price_asc')).toBe('price_asc')
  })
})
