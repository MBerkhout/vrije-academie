'use client'

import type {
  CheckoutConfirmationItem,
  CheckoutConfirmationPayload,
} from '@/lib/commerce/checkout-confirmation-types'
import type { Order, OrderItem } from '@/lib/commerce/types'
import { ThankYouOrderItems, ThankYouOrderTotals } from '@/components/thank-you/ThankYouOrderSummary'
import { defaultMessages } from '@/lib/i18n/messages'
import { formatDateShort, formatPriceEur } from '@/lib/locale-format'

function orderItemsFallback(items: OrderItem[] | undefined): CheckoutConfirmationItem[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
    thumbnail: item.thumbnail,
    product_handle: null,
    is_vathuis: false,
    event_item: null,
    vathuis: null,
    instructor_names: [],
  }))
}

export function AccountOrderCard({
  order,
  confirmation,
}: {
  order: Order
  confirmation: CheckoutConfirmationPayload | null
}) {
  const t = defaultMessages.accountPage
  const items =
    confirmation?.items?.length ? confirmation.items : orderItemsFallback(order.items)
  const subtotal = confirmation?.order?.subtotal ?? order.subtotal
  const discountTotal = confirmation?.order?.discount_total ?? order.discount_total
  const taxTotal = confirmation?.order?.tax_total ?? order.tax_total
  const total = confirmation?.order?.total ?? order.total

  return (
    <li className="border border-va-lightgray bg-white p-4 rounded-none font-sans text-sm">
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

      {items.length > 0 ? (
        <div className="mt-4">
          <ThankYouOrderItems items={items} linkToProduct />
        </div>
      ) : (
        <div className="mt-2 text-va-black">
          {t.ordersTotal}: {formatPriceEur(total, 'standard')}
        </div>
      )}

      {items.length > 0 ? (
        <ThankYouOrderTotals
          subtotal={subtotal}
          discountTotal={discountTotal}
          taxTotal={taxTotal}
          total={total}
        />
      ) : null}
    </li>
  )
}
