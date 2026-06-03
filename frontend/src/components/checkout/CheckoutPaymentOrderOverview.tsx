'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getCartId } from '@/lib/commerce/cart'
import { commerceClient } from '@/lib/commerce'
import type { Cart } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import {
  OrderSummaryLineItems,
  OrderSummaryTotalsBlock,
} from '@/components/checkout/CheckoutOrderSummary'
import { fetchCartExtras } from '@/lib/commerce/fetch-cart-extras'

type OrderSummaryLabels = NonNullable<NonNullable<GeneralSettings['checkout']>['orderSummary']>

interface CheckoutPaymentOrderOverviewProps {
  labels?: OrderSummaryLabels
}

function pencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Payment step: order lines + totals in the same pattern as “Jouw gegevens” (title row, bordered gray panel). */
export function CheckoutPaymentOrderOverview({ labels }: CheckoutPaymentOrderOverviewProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [extras, setExtras] = useState<CartItemExtras[]>([])

  const load = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onUpdate = () => void load()
    window.addEventListener('va:cart-updated', onUpdate)
    return () => window.removeEventListener('va:cart-updated', onUpdate)
  }, [load])

  if (!cart || cart.items.length === 0) return null

  const heading = labels?.heading ?? 'Bestellingsoverzicht'
  const changeLinkLabel = labels?.changeLabel ?? 'Winkelwagen wijzigen'

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-sans text-base font-bold text-va-black">{heading}</h2>
        <Link
          href="/winkelwagen"
          className="flex items-center gap-1.5 font-sans text-sm text-va-darkgray hover:text-va-black transition-colors shrink-0"
        >
          {pencilIcon()}
          <span className="underline underline-offset-2">{changeLinkLabel}</span>
        </Link>
      </div>
      <div className="border border-va-lightgray-300 bg-va-lightgray-100 px-4 py-3 font-sans text-sm space-y-4">
        <OrderSummaryLineItems cart={cart} extras={extras} />
        <OrderSummaryTotalsBlock cart={cart} labels={labels} />
      </div>
    </section>
  )
}
