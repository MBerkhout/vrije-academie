'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackScroll } from '@/lib/analytics/events/engagement'
import { resolvePageType } from '@/lib/analytics/page-types'

export function ScrollDepthTracker({ threshold = 90 }: { threshold?: number }) {
  const pathname = usePathname() ?? ''
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
  }, [pathname])

  useEffect(() => {
    function onScroll() {
      if (fired.current) return
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) return
      const percent = Math.round((window.scrollY / scrollHeight) * 100)
      if (percent >= threshold) {
        fired.current = true
        trackScroll(threshold, resolvePageType(pathname))
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname, threshold])

  return null
}
