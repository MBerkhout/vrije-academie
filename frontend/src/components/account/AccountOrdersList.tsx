'use client'

import { useCallback, useEffect, useState } from 'react'
import { AccountOrderCard } from '@/components/account/AccountOrderCard'
import { commerceClient } from '@/lib/commerce'
import type { CheckoutConfirmationPayload } from '@/lib/commerce/checkout-confirmation-types'
import { fetchCheckoutConfirmationsBatch } from '@/lib/commerce/fetch-checkout-confirmation'
import type { Order, OrderHistoryImportStatus } from '@/lib/commerce/types'
import { defaultMessages } from '@/lib/i18n/messages'

type OrderRow = {
  order: Order
  confirmation: CheckoutConfirmationPayload | null
}

const POLL_MS = 4000

function isImportActive(status: OrderHistoryImportStatus['status']): boolean {
  return status === 'pending' || status === 'running'
}

export function AccountOrdersList() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [importStatus, setImportStatus] = useState<OrderHistoryImportStatus | null>(null)
  const [activeVathuisHandles, setActiveVathuisHandles] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  const loadOrders = useCallback(async () => {
    const { orders: list } = await commerceClient.listCustomerOrders({ limit: 50 })
    const confirmations = await fetchCheckoutConfirmationsBatch(list.map((o) => o.id)).catch(
      () => ({}) as Record<string, CheckoutConfirmationPayload>
    )
    const enriched = list.map((order) => {
      const confirmation = confirmations[order.id]
      return { order, confirmation: confirmation?.status === 'ready' ? confirmation : null }
    })
    setRows(enriched)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [status, access] = await Promise.all([
          commerceClient.getOrderHistoryImportStatus(),
          commerceClient.listVathuisAccess().catch(() => []),
          loadOrders(),
        ])
        if (!cancelled) {
          setImportStatus(status)
          setActiveVathuisHandles(
            new Set(access.filter((item) => !item.isExpired).map((item) => item.productHandle))
          )
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
  }, [loadOrders])

  useEffect(() => {
    if (!importStatus || !isImportActive(importStatus.status)) return

    const id = window.setInterval(() => {
      void (async () => {
        const status = await commerceClient.getOrderHistoryImportStatus()
        setImportStatus(status)
        if (!isImportActive(status.status)) {
          await loadOrders()
        }
      })()
    }, POLL_MS)

    return () => window.clearInterval(id)
  }, [importStatus?.status, loadOrders])

  if (loading) {
    return (
      <p className="font-sans text-va-darkgray" aria-busy="true">
        {common.loadingEllipsis}
      </p>
    )
  }

  const showImportBanner =
    importStatus != null && isImportActive(importStatus.status)

  return (
    <div className="space-y-4">
      {showImportBanner ? (
        <div
          className="rounded-none border border-va-lightgray bg-va-lightgray/40 p-4 font-sans text-sm text-va-black"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">{t.ordersImportInProgress}</p>
          {importStatus.total != null && importStatus.total > 0 ? (
            <p className="mt-1 text-va-darkgray">
              {t.ordersImportProgress
                .replace('{imported}', String(importStatus.imported))
                .replace('{total}', String(importStatus.total))}
            </p>
          ) : (
            <p className="mt-1 text-va-darkgray">{t.ordersImportInProgressHint}</p>
          )}
        </div>
      ) : null}

      {importStatus?.status === 'failed' ? (
        <p className="font-sans text-sm text-va-darkgray">{t.ordersImportFailed}</p>
      ) : null}

      {error ? (
        <p className="font-sans text-sm text-va-darkgray">{t.ordersError}</p>
      ) : rows.length === 0 ? (
        <p className="font-sans text-sm text-va-darkgray">{t.ordersEmpty}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ order, confirmation }) => (
            <AccountOrderCard
              key={order.id}
              order={order}
              confirmation={confirmation}
              activeVathuisHandles={activeVathuisHandles}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
