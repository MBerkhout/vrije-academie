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

function CartQuantityStepper({
  item,
  updating,
  isGiftPurchase,
  onQuantityChange,
}: {
  item: CartItem
  updating: boolean
  isGiftPurchase: boolean
  onQuantityChange: (itemId: string, quantity: number) => Promise<void>
}) {
  if (isGiftPurchase) {
    return <span className="font-sans text-sm text-va-darkgray tabular-nums">1</span>
  }

  return (
    <div
      className="inline-flex w-fit shrink-0 items-stretch overflow-hidden rounded-md border border-va-gray-300 divide-x divide-va-gray-300"
      role="group"
      aria-label="Aantal"
    >
      <button
        type="button"
        aria-label="Minder"
        disabled={updating || item.quantity <= 1}
        onClick={() => onQuantityChange(item.id, item.quantity - 1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center font-sans text-base text-va-black transition-colors hover:bg-va-lightgray-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span
        aria-live="polite"
        aria-atomic="true"
        className="flex h-8 min-w-[2.75rem] shrink-0 items-center justify-center bg-white px-2 font-sans text-sm tabular-nums text-va-black"
      >
        {item.quantity}
      </span>
      <button
        type="button"
        aria-label="Meer"
        disabled={updating || item.quantity >= 12}
        onClick={() => onQuantityChange(item.id, item.quantity + 1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center font-sans text-base text-va-black transition-colors hover:bg-va-lightgray-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  )
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
    <div
      className={clsx(
        'grid grid-cols-[4rem_1fr] gap-x-3 gap-y-3 px-4 py-4 sm:gap-x-4 md:grid-cols-[5rem_1fr_auto]',
        updating && 'pointer-events-none opacity-60'
      )}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-va-lightgray-200 md:h-20 md:w-20">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-va-lightgray-200" />
        )}
      </div>

      <div className="min-w-0">
        {handle ? (
          <Link
            href={plpProductPath(handle)}
            className="font-sans text-sm font-semibold leading-snug text-va-black hover:underline"
          >
            {title}
          </Link>
        ) : (
          <span className="font-sans text-sm font-semibold leading-snug text-va-black">{title}</span>
        )}

        <CartLineItemDetails blocks={detailBlocks} variant="cart" />
      </div>

      <div className="col-span-2 flex flex-col gap-2 md:col-span-1 md:col-start-3 md:row-start-1 md:items-end">
        <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end md:gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <span className="shrink-0 font-sans text-xs font-semibold text-va-darkgray md:hidden">
              Aantal
            </span>
            <CartQuantityStepper
              item={item}
              updating={updating}
              isGiftPurchase={isGiftPurchase}
              onQuantityChange={onQuantityChange}
            />
          </div>
          <span className="font-sans text-sm font-semibold whitespace-nowrap text-va-black md:w-16 md:text-right">
            {formatPriceEur(lineTotal, 'standard')}
          </span>
        </div>
        <div className="md:flex md:w-full md:justify-end md:gap-2">
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={updating}
            className="font-sans text-xs text-va-darkgray underline underline-offset-2 transition-colors hover:text-red-600 md:text-left"
          >
            Verwijderen
          </button>
          <span className="hidden w-16 md:inline" aria-hidden />
        </div>
      </div>
    </div>
  )
}
