import { describe, it, expect } from 'vitest'
import {
  parseFilterState,
  serializeFilterState,
  hasActiveFilters,
  removeFilter,
  clearFilters,
} from '../../../app/(main)/ons-aanbod/_state/url'

describe('parseFilterState', () => {
  it('returns empty state for empty params', () => {
    const state = parseFilterState(new URLSearchParams())
    expect(state.q).toBeUndefined()
    expect(state.categories).toEqual([])
    expect(state.teachers).toEqual([])
    expect(state.cities).toEqual([])
  })

  it('parses q from URL', () => {
    const params = new URLSearchParams('q=aquarel')
    const state = parseFilterState(params)
    expect(state.q).toBe('aquarel')
  })

  it('parses multiple category values', () => {
    const params = new URLSearchParams('category=kunst&category=muziek')
    const state = parseFilterState(params)
    expect(state.categories).toEqual(['kunst', 'muziek'])
  })

  it('parses sort', () => {
    const params = new URLSearchParams('sort=price_asc')
    const state = parseFilterState(params)
    expect(state.sort).toBe('price_asc')
  })
})

describe('serializeFilterState', () => {
  it('produces empty params for empty state', () => {
    const params = serializeFilterState({})
    expect(params.toString()).toBe('')
  })

  it('serializes q', () => {
    const params = serializeFilterState({ q: 'aquarel' })
    expect(params.get('q')).toBe('aquarel')
  })

  it('serializes multiple categories', () => {
    const params = serializeFilterState({ categories: ['kunst', 'muziek'] })
    expect(params.getAll('category')).toEqual(['kunst', 'muziek'])
  })

  it('round-trips through parse and serialize', () => {
    const original = new URLSearchParams('q=test&category=kunst&sort=newest')
    const state = parseFilterState(original)
    const serialized = serializeFilterState(state)
    expect(serialized.get('q')).toBe('test')
    expect(serialized.getAll('category')).toContain('kunst')
    expect(serialized.get('sort')).toBe('newest')
  })
})

describe('hasActiveFilters', () => {
  it('returns false for empty state', () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it('returns true when q is set', () => {
    expect(hasActiveFilters({ q: 'test' })).toBe(true)
  })

  it('returns true when categories has items', () => {
    expect(hasActiveFilters({ categories: ['kunst'] })).toBe(true)
  })

  it('returns false for empty arrays', () => {
    expect(hasActiveFilters({ categories: [], teachers: [], cities: [] })).toBe(false)
  })
})

describe('removeFilter', () => {
  it('removes q', () => {
    const state = removeFilter({ q: 'test', categories: ['kunst'] }, 'q')
    expect(state.q).toBeUndefined()
    expect(state.categories).toEqual(['kunst'])
  })

  it('removes a single value from array filter', () => {
    const state = removeFilter({ categories: ['kunst', 'muziek'] }, 'categories', 'kunst')
    expect(state.categories).toEqual(['muziek'])
  })
})

describe('clearFilters', () => {
  it('returns empty object', () => {
    expect(clearFilters()).toEqual({})
  })
})
