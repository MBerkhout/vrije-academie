'use client'

import { useEffect } from 'react'
import { trackOutboundClick } from '@/lib/analytics/events/engagement'
import { getSiteOrigin } from '@/lib/json-ld'

function linkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isOutboundHref(href: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false
  }
  try {
    const origin = getSiteOrigin()
    const url = new URL(href, origin)
    const siteHost = new URL(origin).hostname.replace(/^www\./, '')
    const linkHost = url.hostname.replace(/^www\./, '')
    return linkHost !== siteHost
  } catch {
    return false
  }
}

export function OutboundLinkTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      const href = anchor.href
      if (!isOutboundHref(href)) return
      trackOutboundClick(href, linkDomain(href), anchor.textContent ?? anchor.getAttribute('aria-label') ?? '')
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
