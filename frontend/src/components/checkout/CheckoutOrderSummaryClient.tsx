'use client'

import { useEffect, useState } from 'react'
import { getCartId } from '@/lib/commerce/cart'
import { commerceClient } from '@/lib/commerce'
import { fetchCartExtras } from '@/lib/commerce/fetch-cart-extras'
import type { Cart } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import {
  CheckoutOrderSummaryDesktop,
  CheckoutOrderSummaryHelpTrustOnly,
  CheckoutOrderSummaryMobile,
  type CheckoutHelpContact,
} from './CheckoutOrderSummary'

interface CheckoutOrderSummaryClientProps {
  labels?: {
    heading?: string
    changeLabel?: string
    subtotalLabel?: string
    discountLabel?: string
    vatLabel?: string
    totalLabel?: string
  }
  trust?: {
    secure?: string
    cancellation?: string
    support?: string
    cancellationDays?: number
  }
  helpContact?: CheckoutHelpContact
  /** `helpTrustOnly`: payment step — sidebar shows Hulp nodig + USPs only (order lives in main column). */
  variant?: 'default' | 'helpTrustOnly'
}

export function CheckoutOrderSummaryClient({
  labels,
  trust,
  helpContact,
  variant = 'default',
}: CheckoutOrderSummaryClientProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [extras, setExtras] = useState<CartItemExtras[]>([])

  useEffect(() => {
    if (variant === 'helpTrustOnly') return

    async function load() {
      const cartId = getCartId()
      if (!cartId) return
      try {
        const [cartData, extrasList] = await Promise.all([
          commerceClient.getCart(cartId),
          fetchCartExtras(cartId),
        ])
        setCart(cartData)
        setExtras(extrasList)
      } catch {
        setCart(null)
        setExtras([])
      }
    }

    void load()
    const onUpdate = () => void load()
    window.addEventListener('va:cart-updated', onUpdate)
    return () => window.removeEventListener('va:cart-updated', onUpdate)
  }, [variant])

  if (variant === 'helpTrustOnly') {
    return <CheckoutOrderSummaryHelpTrustOnly trust={trust} helpContact={helpContact} />
  }

  return (
    <>
      <CheckoutOrderSummaryMobile cart={cart} labels={labels} trust={trust} helpContact={helpContact} extras={extras} />
      <CheckoutOrderSummaryDesktop cart={cart} labels={labels} trust={trust} helpContact={helpContact} extras={extras} />
    </>
  )
}
