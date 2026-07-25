'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import { isCustomerProfileComplete, isGuestCartCheckoutReady } from '@/lib/commerce/checkout-profile'
import { ensureGuestCheckoutCartHydrated } from '@/lib/commerce/checkout-resume'
import { getActiveCart } from '@/lib/commerce/cart'
import { useCustomer } from '@/lib/commerce/CustomerProvider'
import { trackBeginCheckout } from '@/lib/analytics/events/ecommerce'
import { buildUserDataFromCustomer, buildUserDataFromFields } from '@/lib/analytics/mappers/user-data'
import { fetchCartExtras } from '@/lib/commerce/fetch-cart-extras'

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

  async function handleClick() {
    const cart = await getActiveCart()
    if (!cart) return
    const extras = await fetchCartExtras(cart.id)
    const userData =
      buildUserDataFromCustomer(customer) ??
      buildUserDataFromFields({
        email: cart.email,
        phone: cart.shipping_address?.phone,
        first_name: cart.shipping_address?.first_name,
        last_name: cart.shipping_address?.last_name,
        postal_code: cart.shipping_address?.postal_code,
        country: cart.shipping_address?.country_code,
      })
    trackBeginCheckout(cart, extras, userData)
  }

  return (
    <Link
      href={href}
      onClick={() => void handleClick()}
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
