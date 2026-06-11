'use client'

import Image from 'next/image'
import Link from 'next/link'
import { plpProductPath } from '@/lib/routes'
import clsx from 'clsx'
import type { CartItem } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import { formatPriceEur } from '@/lib/locale-format'
import { isGiftCardPurchaseLineItem } from '@/lib/commerce/gift-card'
import { buildCartLineItemDetailBlocks } from '@/lib/commerce/line-item-details'
import { CartLineItemDetails } from '@/components/cart/CartLineItemDetails'

export type { CartItemExtras } from '@/lib/commerce/cart-item-extras'

interface CartItemRowProps {
  item: CartItem
  extras: CartItemExtras | null
  updating: boolean
  groupBookingNotice?: string
  onQuantityChange: (itemId: string, quantity: number) => Promise<void>
  onRemove: (itemId: string) => Promise<void>
}

export function CartItemRow({
  item,
  extras,
  updating,
  groupBookingNotice,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  const thumbnail = extras?.thumbnail ?? (item as any).thumbnail ?? null
  const handle = extras?.product_handle
  const title = extras?.product_title ?? item.title

  const lineTotal = item.total ?? item.unit_price * item.quantity
  const isGiftPurchase = isGiftCardPurchaseLineItem(item)

  const detailBlocks = buildCartLineItemDetailBlocks(item, extras, {
    groupBookingNotice,
  })

  return (
    <div className={clsx('py-4 flex gap-4', updating && 'opacity-60 pointer-events-none')}>
      {/* Thumbnail */}
      <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 overflow-hidden bg-va-lightgray-200 rounded-lg">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-va-lightgray-200" />
        )}
      </div>

      {/* Middle: title + session details */}
      <div className="flex-1 min-w-0">
        {handle ? (
          <Link
            href={plpProductPath(handle)}
            className="font-sans font-semibold text-sm text-va-black hover:underline leading-snug"
          >
            {title}
          </Link>
        ) : (
          <span className="font-sans font-semibold text-sm text-va-black leading-snug">{title}</span>
        )}

        <CartLineItemDetails blocks={detailBlocks} variant="cart" />
      </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {/* Qty stepper — gift cards are always qty 1 */}
            <div className="flex items-center">
              {isGiftPurchase ? (
                <span className="font-sans text-sm text-va-darkgray w-24 text-center tabular-nums">1</span>
              ) : (
              <>
              <button
                type="button"
                aria-label="Minder"
                disabled={updating || item.quantity <= 1}
                onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                className="w-7 h-7 flex items-center justify-center border border-r-0 border-va-gray-300 font-sans text-base text-va-black hover:bg-va-lightgray-200 disabled:opacity-40 transition-colors"
              >
                −
              </button>
              <label className="sr-only" htmlFor={`qty-${item.id}`}>Aantal</label>
              <select
                id={`qty-${item.id}`}
                value={item.quantity}
                onChange={(e) => onQuantityChange(item.id, Number(e.target.value))}
                disabled={updating}
                className="h-7 border border-va-gray-300 px-1 font-sans text-sm bg-white outline-none focus-visible:ring-2 focus-visible:ring-va-yellow text-center appearance-none w-10"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Meer"
                disabled={updating || item.quantity >= 12}
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                className="w-7 h-7 flex items-center justify-center border border-l-0 border-va-gray-300 font-sans text-base text-va-black hover:bg-va-lightgray-200 disabled:opacity-40 transition-colors"
              >
                +
              </button>
              </>
              )}
            </div>
            {/* Price */}
            <span className="font-sans font-semibold text-sm text-va-black whitespace-nowrap w-16 text-right">
              {formatPriceEur(lineTotal, 'standard')}
            </span>
          </div>

          {/* Verwijderen — below qty stepper, aligned left of stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={updating}
              className="font-sans text-xs text-va-darkgray hover:text-red-600 underline underline-offset-2 transition-colors w-24 text-left"
            >
              Verwijderen
            </button>
            <span className="w-16" aria-hidden />
          </div>
        </div>
    </div>
  )
}
