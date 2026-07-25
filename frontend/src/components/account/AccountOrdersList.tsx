'use client'

import { useEffect, useState } from 'react'
import { AccountOrderCard } from '@/components/account/AccountOrderCard'
import { commerceClient } from '@/lib/commerce'
import type { CheckoutConfirmationPayload } from '@/lib/commerce/checkout-confirmation-types'
import { fetchCheckoutConfirmation } from '@/lib/commerce/fetch-checkout-confirmation'
import type { Order } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'

type OrderRow = {
  order: Order
  confirmation: CheckoutConfirmationPayload | null
}

export function AccountOrdersList() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { orders: list } = await commerceClient.listCustomerOrders({ limit: 50 })
        const enriched = await Promise.all(
          list.map(async (order) => {
            try {
              const confirmation = await fetchCheckoutConfirmation({ orderId: order.id })
              return {
                order,
                confirmation: confirmation.status === 'ready' ? confirmation : null,
              }
            } catch {
              return { order, confirmation: null }
            }
          })
        )
        if (!cancelled) {
          setRows(enriched)
          setError(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <p className="font-sans text-va-darkgray" aria-busy="true">
        {common.loadingEllipsis}
      </p>
    )
  }

  if (error) {
    return (
      <p className="font-sans text-sm text-va-darkgray">
        {t.ordersError}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="font-sans text-sm text-va-darkgray">{t.ordersEmpty}</p>
  }

  return (
    <ul className="space-y-4">
      {rows.map(({ order, confirmation }) => (
        <AccountOrderCard key={order.id} order={order} confirmation={confirmation} />
      ))}
    </ul>
  )
}
