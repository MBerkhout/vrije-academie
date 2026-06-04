'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { isCustomerProfileComplete, isGuestCartCheckoutReady } from '@/lib/commerce/checkout-profile'
import { ensureGuestCheckoutCartHydrated } from '@/lib/commerce/checkout-resume'
import { useCustomer } from '@/lib/commerce/CustomerProvider'

interface ProceedCtaProps {
  label?: string
  fullWidth?: boolean
}

export function ProceedCta({ label, fullWidth = false }: ProceedCtaProps) {
  const { customer, loading: customerLoading } = useCustomer()
  const [href, setHref] = useState('/checkout/inloggen')

  useEffect(() => {
    if (customerLoading) return

    let cancelled = false

    async function resolveHref() {
      if (customer && isCustomerProfileComplete(customer)) {
        if (!cancelled) setHref('/checkout/betaling')
        return
      }

      const cart = await ensureGuestCheckoutCartHydrated()
      if (!cancelled && isGuestCartCheckoutReady(cart)) {
        setHref('/checkout/betaling')
      } else if (!cancelled) {
        setHref('/checkout/inloggen')
      }
    }

    resolveHref()
    return () => {
      cancelled = true
    }
  }, [customer, customerLoading])

  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex items-center justify-center',
        'bg-va-yellow text-va-black font-sans font-semibold text-sm',
        'px-6 py-3 hover:bg-va-yellow/90 transition-colors',
        fullWidth && 'w-full'
      )}
    >
      {label ?? 'Doorgaan met afrekenen'}
    </Link>
  )
}
