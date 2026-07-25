'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackViewAccount } from '@/lib/analytics/events/ecommerce'

const SECTION_BY_PATH: Record<string, string> = {
  '/mijn-account': 'profiel',
  '/mijn-account/gegevens': 'gegevens',
  '/mijn-account/aankopen': 'aankopen',
  '/mijn-account/bewaard': 'bewaard',
  '/mijn-account/collectie': 'collectie',
}

export function AccountViewTracker() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    if (!pathname.startsWith('/mijn-account')) return
    const section = SECTION_BY_PATH[pathname] ?? 'overig'
    trackViewAccount(section)
  }, [pathname])

  return null
}
