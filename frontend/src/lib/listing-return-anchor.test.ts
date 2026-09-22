import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearListingReturnAnchor,
  keepLoadedListingItems,
  readCachedListingItems,
  writeCachedListingItems,
  appendUniqueListingItems,
  clearCachedListingItems,
  listingAgendaAnchorId,
  listingProductAnchorId,
  markListingReturnAnchor,
  parseListingAnchorId,
  peekListingReturnAnchor,
  peekListingReturnScrollY,
  restoreListingReturnScrollPosition,
  installListingReturnScrollGuard,
} from './listing-return-anchor'

describe('listing anchor ids', () => {
  it('builds a product card id from the handle', () => {
    expect(listingProductAnchorId('reis-andalusie')).toBe('product-reis-andalusie')
  })

  it('builds a unique agenda row id from item and variant', () => {
    expect(listingAgendaAnchorId('evt_1', 'var_9')).toBe('agenda-evt_1-var_9')
  })

  it('accepts listing hashes and rejects unrelated hashes', () => {
    expect(parseListingAnchorId('#product-foo')).toBe('product-foo')
    expect(parseListingAnchorId('agenda-a-b')).toBe('agenda-a-b')
    expect(parseListingAnchorId('#sessies')).toBeNull()
    expect(parseListingAnchorId('')).toBeNull()
  })
})

describe('listing return anchor storage', () => {
  afterEach(() => {
    sessionStorage.clear()
    window.history.replaceState(null, '', '/ons-aanbod')
    vi.restoreAllMocks()
  })

  it('stamps the hash and restores it on the same listing URL', () => {
    window.history.replaceState({ next: { tree: true } }, '', '/ons-aanbod?sort=order')
    markListingReturnAnchor('product-reis-andalusie')

    expect(window.location.hash).toBe('#product-reis-andalusie')
    expect(window.history.state).toMatchObject({
      next: { tree: true },
      vaListingAnchor: 'product-reis-andalusie',
    })
    expect(peekListingReturnAnchor()).toBe('product-reis-andalusie')
  })

  it('stores the current scroll offset with the listing return token', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1840 })
    window.history.replaceState(null, '', '/ons-aanbod')
    markListingReturnAnchor('product-reis-andalusie')

    expect(peekListingReturnScrollY()).toBe(1840)
  })

  it('restores the saved offset before looking up the card', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1840 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.history.replaceState(null, '', '/ons-aanbod')
    markListingReturnAnchor('product-missing')

    expect(restoreListingReturnScrollPosition()).toBe('waiting')
    expect(scrollTo).toHaveBeenCalledWith(0, 1840)
  })

  it('rewrites a scroll-to-top into the saved listing offset', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1840 })
    const native = vi.fn()
    window.scrollTo = native as typeof window.scrollTo
    window.history.replaceState(null, '', '/ons-aanbod')
    markListingReturnAnchor('product-reis-andalusie')
    const uninstall = installListingReturnScrollGuard()

    window.scrollTo(0, 0)
    expect(native).toHaveBeenCalledWith(0, 1840)

    uninstall()
  })

  it('still restores from sessionStorage if the hash was stripped', () => {
    window.history.replaceState(null, '', '/ons-aanbod?sort=order')
    markListingReturnAnchor('product-reis-andalusie')
    window.history.replaceState(null, '', '/ons-aanbod?sort=order')

    expect(window.location.hash).toBe('')
    expect(peekListingReturnAnchor()).toBe('product-reis-andalusie')
  })

  it('does not restore on a different path', () => {
    window.history.replaceState(null, '', '/ons-aanbod')
    markListingReturnAnchor('product-reis-andalusie')
    window.history.replaceState(null, '', '/ons-aanbod/reis-andalusie')

    expect(peekListingReturnAnchor()).toBeNull()
    expect(peekListingReturnScrollY()).toBeNull()
  })

  it('clears the saved token after restore', () => {
    window.history.replaceState(null, '', '/ons-aanbod')
    markListingReturnAnchor('product-foo')
    clearListingReturnAnchor()

    expect(window.location.hash).toBe('')
    expect(peekListingReturnAnchor()).toBeNull()
    expect(peekListingReturnScrollY()).toBeNull()
  })
})

describe('keepLoadedListingItems', () => {
  it('keeps extra infinite-scroll pages when the first page is resent', () => {
    const first = [{ id: 'a' }, { id: 'b' }]
    const loaded = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    expect(keepLoadedListingItems(loaded, first)).toBe(loaded)
  })

  it('replaces when the incoming first page is a different result set', () => {
    const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const incoming = [{ id: 'x' }, { id: 'y' }]
    expect(keepLoadedListingItems(prev, incoming)).toEqual(incoming)
  })
})

describe('listing items cache', () => {
  afterEach(() => {
    clearCachedListingItems()
  })

  it('restores extra pages after a remount of the same listing', () => {
    const first = [{ id: 'a' }, { id: 'b' }]
    const loaded = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    writeCachedListingItems('plp:test', loaded)
    expect(readCachedListingItems('plp:test', first)).toBe(loaded)
  })

  it('appends only unseen ids so overlapping loadMore cannot pad the list', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    expect(appendUniqueListingItems(prev, [{ id: 'b' }, { id: 'c' }])).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ])
  })
})
