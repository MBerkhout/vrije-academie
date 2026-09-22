'use client'

import { useLayoutEffect } from 'react'

function scrollToTop() {
  window.scrollTo(0, 0)
}

/** Resets window scroll when a short replacement view (e.g. 404) mounts. */
export function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    scrollToTop()
    const raf = window.requestAnimationFrame(scrollToTop)
    const timeout = window.setTimeout(scrollToTop, 50)

    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = previousRestoration
      }
    }
  }, [])

  return null
}
