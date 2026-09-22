import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ScrollToTopOnMount } from './ScrollToTopOnMount'

describe('ScrollToTopOnMount', () => {
  beforeEach(() => {
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      writable: true,
      value: 'auto',
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scrolls to the top when it mounts', () => {
    render(<ScrollToTopOnMount />)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('sets history.scrollRestoration to manual while mounted', () => {
    const { unmount } = render(<ScrollToTopOnMount />)
    expect(window.history.scrollRestoration).toBe('manual')
    unmount()
    expect(window.history.scrollRestoration).toBe('auto')
  })
})
