'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackCheckoutStepView } from '@/lib/analytics/events/ecommerce'

function pathToStep(pathname: string): { step: number; stepName: string } {
  if (pathname.includes('/checkout/bevestiging') || pathname.includes('/bedankt')) {
    return { step: 4, stepName: 'bevestiging' }
  }
  if (pathname.includes('/checkout/betaling')) {
    return { step: 3, stepName: 'betaalgegevens' }
  }
  if (pathname.includes('/checkout/inloggen')) {
    return { step: 2, stepName: 'gegevens' }
  }
  if (pathname.includes('/winkelwagen')) {
    return { step: 1, stepName: 'winkelwagen' }
  }
  if (pathname.includes('/checkout') || pathname.includes('/afrekenen')) {
    return { step: 2, stepName: 'gegevens' }
  }
  return { step: 1, stepName: 'overig' }
}

export function CheckoutStepTracker() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    const { step, stepName } = pathToStep(pathname)
    if (stepName === 'overig') return
    trackCheckoutStepView(step, stepName)
  }, [pathname])

  return null
}
