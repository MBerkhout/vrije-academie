'use client'

import Link from 'next/link'
import type { CheckoutConfirmationItem } from '@/lib/commerce/checkout-confirmation-types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import {
  buildCartLineItemDetailBlocks,
  buildLineItemQuantityLabel,
} from '@/lib/commerce/line-item-details'
import { CartLineItemDetails } from '@/components/cart/CartLineItemDetails'
import { OrderSummaryThumbnail } from '@/components/checkout/CheckoutOrderSummary'
import { formatPriceEur } from '@/lib/locale-format'
import { productDetailPath, vathuisProductPath } from '@/lib/routes'

function productHrefForItem(item: CheckoutConfirmationItem): string | null {
  if (!item.product_handle) return null
  return productDetailPath(item.product_handle, {
    recordType: item.is_vathuis ? 'vathuis' : null,
  })
}

function itemToCartShape(item: CheckoutConfirmationItem) {
  return {
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
    thumbnail: item.thumbnail,
  }
}

function itemToExtras(item: CheckoutConfirmationItem): CartItemExtras {
  return {
    line_item_id: item.id,
    product_id: null,
    product_handle: item.product_handle ?? null,
    product_title: item.title,
    thumbnail: item.thumbnail ?? null,
    event_item: item.event_item,
    vathuis: item.vathuis,
    instructor_names: item.instructor_names,
  }
}

export function ThankYouOrderItems({
  items,
  linkToProduct = false,
}: {
  items: CheckoutConfirmationItem[]
  /** When true, title and thumbnail link to the product PDP (e.g. Mijn account → Aankopen). */
  linkToProduct?: boolean
}) {
  if (!items.length) return null

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const cartItem = itemToCartShape(item)
        const extras = itemToExtras(item)
        const blocks = buildCartLineItemDetailBlocks(cartItem as any, extras, {
          onlineCityFallback: true,
          quantityLabel: buildLineItemQuantityLabel(cartItem as any),
        })
        const productHref = linkToProduct ? productHrefForItem(item) : null
        const watchHref =
          item.is_vathuis && item.product_handle
            ? vathuisProductPath(item.product_handle)
            : null

        return (
          <li key={item.id} className="flex gap-3 items-start border-b border-va-lightgray-200 pb-4 last:border-0 last:pb-0">
            {item.thumbnail ? (
              productHref ? (
                <Link
                  href={productHref}
                  className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-va-yellow"
                >
                  <OrderSummaryThumbnail src={item.thumbnail} alt={item.title} />
                </Link>
              ) : (
                <OrderSummaryThumbnail src={item.thumbnail} alt={item.title} />
              )
            ) : null}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex justify-between items-start gap-3">
                {productHref ? (
                  <Link
                    href={productHref}
                    className="font-sans text-sm font-bold text-va-black leading-snug min-w-0 flex-1 hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-sans text-sm font-bold text-va-black leading-snug min-w-0 flex-1">
                    {item.title}
                  </p>
                )}
                <p className="font-sans text-sm font-semibold text-va-black whitespace-nowrap shrink-0">
                  {formatPriceEur(item.total)}
                </p>
              </div>
              <CartLineItemDetails blocks={blocks} variant="payment" />
              {watchHref ? (
                <Link
                  href={watchHref}
                  className="inline-flex items-center justify-center bg-va-yellow text-va-black font-sans font-semibold text-sm px-4 py-2 hover:bg-va-yellow/90 transition-colors"
                >
                  Bekijk college
                </Link>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ThankYouOrderTotals({
  subtotal,
  discountTotal,
  taxTotal,
  total,
}: {
  subtotal: number
  discountTotal?: number
  taxTotal?: number
  total: number
}) {
  return (
    <div className="border-t border-va-lightgray-300 pt-3 space-y-1.5 mt-4">
      <div className="flex justify-between font-sans text-xs text-va-darkgray">
        <span>Subtotaal</span>
        <span>{formatPriceEur(subtotal)}</span>
      </div>
      {(discountTotal ?? 0) > 0 && (
        <div className="flex justify-between font-sans text-xs text-green-700">
          <span>Korting</span>
          <span>−{formatPriceEur(discountTotal!)}</span>
        </div>
      )}
      <div className="flex justify-between font-sans text-xs text-va-darkgray">
        <span>BTW</span>
        <span>{formatPriceEur(taxTotal ?? 0)}</span>
      </div>
      <div className="flex justify-between font-sans text-sm font-semibold text-va-black border-t border-va-lightgray-300 pt-2 mt-2">
        <span>Totaal</span>
        <span>{formatPriceEur(total)}</span>
      </div>
    </div>
  )
}
