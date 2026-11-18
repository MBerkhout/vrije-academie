'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccountOrderCard } from '@/components/account/AccountOrderCard'
import { Button } from '@/components/ui/Button'
import { commerceClient } from '@/lib/commerce'
import {
  type AccountOrdersTimeFilter,
  findUpcomingOrderWithinTwoDays,
  getOrderTimeCategory,
  orderMatchesTimeFilter,
} from '@/lib/commerce/account-orders'
import type { CheckoutConfirmationPayload } from '@/lib/commerce/checkout-confirmation-types'
import { fetchCheckoutConfirmationsBatch } from '@/lib/commerce/fetch-checkout-confirmation'
import type { Order, OrderHistoryImportStatus } from '@/lib/commerce/types'
import { defaultMessages, interpolate } from '@/lib/i18n/messages'
import { formatDateShort } from '@/lib/locale-format'
import { cn } from '@/lib/utils'

type OrderRow = {
  order: Order
  confirmation: CheckoutConfirmationPayload | null
}

const POLL_MS = 4000
const PAGE_SIZE = 10
const FETCH_BATCH = 50

function isImportActive(status: OrderHistoryImportStatus['status']): boolean {
  return status === 'pending' || status === 'running'
}

function orderListItems(row: OrderRow) {
  return row.confirmation?.items?.length
    ? row.confirmation.items
    : (row.order.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        event_item: null,
        is_vathuis: false,
        vathuis: null,
      }))
}

async function fetchAllCustomerOrders(): Promise<{ orders: Order[]; count: number }> {
  const first = await commerceClient.listCustomerOrders({ limit: FETCH_BATCH, offset: 0 })
  const total = first.count
  const orders = [...first.orders]
  let offset = orders.length
  while (offset < total) {
    const batch = await commerceClient.listCustomerOrders({ limit: FETCH_BATCH, offset })
    orders.push(...batch.orders)
    offset += batch.orders.length
    if (batch.orders.length === 0) break
  }
  return { orders, count: total }
}

export function AccountOrdersList() {
  const t = defaultMessages.accountPage
  const common = defaultMessages.common
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [importStatus, setImportStatus] = useState<OrderHistoryImportStatus | null>(null)
  const [activeVathuisHandles, setActiveVathuisHandles] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [timeFilter, setTimeFilter] = useState<AccountOrdersTimeFilter>('all')
  const [page, setPage] = useState(1)
  const [pendingScrollOrderId, setPendingScrollOrderId] = useState<string | null>(null)

  const enrichOrders = useCallback(async (list: Order[]) => {
    const confirmations = await fetchCheckoutConfirmationsBatch(list.map((o) => o.id)).catch(
      () => ({}) as Record<string, CheckoutConfirmationPayload>,
    )
    return list.map((order) => {
      const confirmation = confirmations[order.id]
      return { order, confirmation: confirmation?.status === 'ready' ? confirmation : null }
    })
  }, [])

  const loadOrders = useCallback(async () => {
    const { orders: list } = await fetchAllCustomerOrders()
    setRows(await enrichOrders(list))
  }, [enrichOrders])

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
            new Set(access.filter((item) => !item.isExpired).map((item) => item.productHandle)),
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

  useEffect(() => {
    setPage(1)
  }, [timeFilter])

  const rowsWithCategory = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        timeCategory: getOrderTimeCategory(orderListItems(row)),
      })),
    [rows],
  )

  const filteredRows = useMemo(
    () =>
      rowsWithCategory.filter((row) => orderMatchesTimeFilter(row.timeCategory, timeFilter)),
    [rowsWithCategory, timeFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const upcomingSoon = useMemo(
    () =>
      findUpcomingOrderWithinTwoDays(
        rowsWithCategory.map((row) => ({
          order: row.order,
          items: orderListItems(row),
        })),
      ),
    [rowsWithCategory],
  )

  const viewUpcomingOrder = useCallback(
    (orderId: string) => {
      const filteredUpcoming = rowsWithCategory.filter((row) =>
        orderMatchesTimeFilter(row.timeCategory, 'upcoming'),
      )
      const index = filteredUpcoming.findIndex((row) => row.order.id === orderId)
      if (index < 0) {
        setTimeFilter('all')
        const allIndex = rows.findIndex((row) => row.order.id === orderId)
        if (allIndex >= 0) setPage(Math.floor(allIndex / PAGE_SIZE) + 1)
      } else {
        setTimeFilter('upcoming')
        setPage(Math.floor(index / PAGE_SIZE) + 1)
      }
      setPendingScrollOrderId(orderId)
    },
    [rows, rowsWithCategory],
  )

  useEffect(() => {
    if (!pendingScrollOrderId) return
    const el = document.getElementById(`account-order-${pendingScrollOrderId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPendingScrollOrderId(null)
  }, [pendingScrollOrderId, pageRows, timeFilter])

  const filterOptions: { value: AccountOrdersTimeFilter; label: string }[] = [
    { value: 'all', label: t.ordersFilterAll },
    { value: 'upcoming', label: t.ordersFilterUpcoming },
    { value: 'past', label: t.ordersFilterPast },
  ]

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

      {upcomingSoon ? (
        <div
          className="rounded-none border border-va-yellow bg-va-yellow/30 p-4 font-sans text-sm text-va-black"
          role="status"
        >
          <p>
            {interpolate(t.ordersUpcomingSoonBanner, {
              title: upcomingSoon.title,
              date: formatDateShort(upcomingSoon.startAt),
            })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => viewUpcomingOrder(upcomingSoon.orderId)}
          >
            {t.ordersUpcomingSoonView}
          </Button>
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
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t.ordersFilterGroupAria}
          >
            {filterOptions.map((option) => {
              const active = timeFilter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    'font-sans text-sm font-semibold rounded-sm border px-4 py-2 transition-colors',
                    active
                      ? 'border-va-black bg-va-black text-white'
                      : 'border-va-lightgray bg-white text-va-black hover:bg-va-lightgray/60',
                  )}
                  onClick={() => setTimeFilter(option.value)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {filteredRows.length === 0 ? (
            <p className="font-sans text-sm text-va-darkgray">{t.ordersEmptyFiltered}</p>
          ) : (
            <>
              <ul className="space-y-4">
                {pageRows.map(({ order, confirmation }) => (
                  <AccountOrderCard
                    key={order.id}
                    order={order}
                    confirmation={confirmation}
                    activeVathuisHandles={activeVathuisHandles}
                  />
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-va-lightgray pt-4"
                  aria-label={t.ordersPaginationAria}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t.ordersPaginationPrevious}
                  </Button>
                  <p className="font-sans text-sm text-va-darkgray">
                    {interpolate(t.ordersPaginationPage, {
                      page: currentPage,
                      total: totalPages,
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t.ordersPaginationNext}
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  )
}