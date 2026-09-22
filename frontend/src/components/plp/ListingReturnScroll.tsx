'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  clearListingReturnAnchor,
  installListingReturnScrollGuard,
  peekListingReturnAnchor,
  restoreListingReturnScrollPosition,
} from '@/lib/listing-return-anchor'

const MAX_ATTEMPTS = 80
const ATTEMPT_MS = 100
const HOLD_MS = 450

export function ListingReturnScroll() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false
    let attempts = 0
    let foundAt: number | null = null
    let interval: number | null = null
    let raf = 0
    let early = 0
    let uninstallGuard: (() => void) | null = null

    const stopTimers = () => {
      if (raf) window.cancelAnimationFrame(raf)
      if (early) window.clearTimeout(early)
      if (interval != null) window.clearInterval(interval)
      raf = 0
      early = 0
      interval = null
    }

    const finish = () => {
      stopTimers()
      uninstallGuard?.()
      uninstallGuard = null
    }

    const tryScroll = () => {
      if (cancelled) return true
      const state = restoreListingReturnScrollPosition()
      if (state === 'none') return true
      if (state !== 'ready') return false
      if (foundAt == null) foundAt = Date.now()
      if (Date.now() - foundAt >= HOLD_MS) {
        clearListingReturnAnchor()
        return true
      }
      return false
    }

    const start = () => {
      if (!peekListingReturnAnchor()) return
      foundAt = null
      attempts = 0
      stopTimers()
      uninstallGuard?.()
      uninstallGuard = installListingReturnScrollGuard()
      if (tryScroll()) {
        finish()
        return
      }
      raf = window.requestAnimationFrame(() => {
        if (tryScroll()) finish()
      })
      early = window.setTimeout(() => {
        if (tryScroll()) finish()
      }, 50)
      interval = window.setInterval(() => {
        attempts += 1
        if (tryScroll() || attempts >= MAX_ATTEMPTS) {
          finish()
        }
      }, ATTEMPT_MS)
    }

    start()
    window.addEventListener('popstate', start)

    return () => {
      cancelled = true
      window.removeEventListener('popstate', start)
      finish()
    }
  }, [pathname])

  return null
}
