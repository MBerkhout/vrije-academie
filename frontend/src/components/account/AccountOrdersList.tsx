'use client'

import { useEffect, useState } from 'react'
import { commerceClient } from '@/lib/commerce'
import type { Order } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateShort, formatPriceEur } from '@/lib/locale-format'

export function AccountOrdersList() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { orders: list } = await commerceClient.listCustomerOrders({ limit: 50 })
        if (!cancelled) {
          setOrders(list)
          setError(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setOrders([])
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

  if (orders.length === 0) {
    return <p className="font-sans text-sm text-va-darkgray">{t.ordersEmpty}</p>
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li
          key={order.id}
          className="border border-va-lightgray bg-white p-4 rounded-none font-sans text-sm"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="font-medium text-va-black">
              {t.ordersNumber}{' '}
              {order.display_id != null ? `#${order.display_id}` : order.id.slice(-8)}
            </span>
            {order.created_at ? (
              <span className="text-va-darkgray">
                {t.ordersDate}: {formatDateShort(order.created_at)}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-va-black">
            {t.ordersTotal}: {formatPriceEur(order.total, 'standard')}
          </div>
        </li>
      ))}
    </ul>
  )
}
