'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Cart, CartItem } from '@/lib/commerce/types'
import type { CartItemExtras } from '@/lib/commerce/cart-item-extras'
import { buildCartLineItemDetailBlocks, buildLineItemQuantityLabel, type BuildLineItemDetailsOptions } from '@/lib/commerce/line-item-details'
import { CartLineItemDetails } from '@/components/cart/CartLineItemDetails'
import { formatPriceEur } from '@/lib/locale-format'
import { grossMerchandiseTotalCents, vatIncludedLabel, vatPercentFromCartLike } from '@/lib/commerce/vat'
import { TrustSignals } from '@/components/cart/TrustSignals'

export interface CheckoutHelpContact {
  phone?: string
  email?: string
  availability?: string
}

const DEFAULT_HELP: CheckoutHelpContact = {
  phone: 'Telefoon: 088 - 518 5000',
  availability: 'Wij zijn op werkdagen telefonisch bereikbaar van 9:30-11:30 uur',
  email: 'info@vrijeacademie.nl',
}

function telHref(phoneLine: string): string {
  const digits = phoneLine.replace(/\D/g, '')
  if (digits.length >= 9) return `tel:${digits}`
  return 'tel:'
}

function displayPhone(phoneLine: string): string {
  return phoneLine
    .replace(/\s*\(?tegen de gebruikelijke belkosten\)?\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface CheckoutOrderSummaryProps {
  cart: Cart | null
  extras?: CartItemExtras[]
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
}

function CheckoutHelpAndTrust({
  trust,
  helpContact,
  topDivider = true,
}: {
  trust?: CheckoutOrderSummaryProps['trust']
  helpContact?: CheckoutHelpContact
  /** Show rule above block (desktop: below order total). */
  topDivider?: boolean
}) {
  const contact = { ...DEFAULT_HELP, ...helpContact }

  return (
    <div
      className={
        topDivider
          ? 'space-y-4 pt-4 border-t border-va-lightgray-300 mt-4'
          : 'space-y-4'
      }
    >
      <div className="font-sans text-sm">
        <p className="text-base font-semibold text-va-black mb-2">Hulp nodig</p>
        {contact.phone ? (
          <p className="text-va-darkgray">
            <a
              href={telHref(contact.phone)}
              className="underline underline-offset-2 decoration-va-lightgray-400 hover:text-va-black"
            >
              {displayPhone(contact.phone)}
            </a>
          </p>
        ) : null}
        {contact.email ? (
          <p className="text-va-darkgray mt-0.5">
            <a
              href={`mailto:${contact.email}`}
              className="underline underline-offset-2 decoration-va-lightgray-400 hover:text-va-black"
            >
              {contact.email}
            </a>
          </p>
        ) : null}
        {contact.availability ? (
          <p className="text-xs text-va-gray mt-1.5 leading-snug">{contact.availability}</p>
        ) : null}
      </div>
      <TrustSignals
        secure={trust?.secure}
        cancellation={trust?.cancellation}
        support={trust?.support}
        cancellationDays={trust?.cancellationDays}
      />
    </div>
  )
}

export function resolveLineItemThumbnail(
  item: Pick<CartItem, 'thumbnail'>,
  extras: CartItemExtras | null | undefined
): string | null {
  return extras?.thumbnail ?? item.thumbnail ?? null
}

export function OrderSummaryThumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-14 h-14 shrink-0 rounded-lg bg-white overflow-hidden relative border border-va-lightgray-200">
      <Image src={src} alt={alt} fill className="object-cover" sizes="56px" />
    </div>
  )
}

/** Line items only (thumbnail + title + qty + price). */
export function OrderSummaryLineItems({
  cart,
  extras,
  detailOptions,
}: Pick<CheckoutOrderSummaryProps, 'cart' | 'extras'> & {
  detailOptions?: BuildLineItemDetailsOptions
}) {
  if (!cart || cart.items.length === 0) return null

  const items = cart.items

  if (items.length === 0) return null

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const itemExtras = extras?.find((e) => e.line_item_id === item.id) ?? null
        const thumbnail = resolveLineItemThumbnail(item, itemExtras)
        const title = itemExtras?.product_title ?? item.title
        const blocks = buildCartLineItemDetailBlocks(item, itemExtras, {
          onlineCityFallback: true,
          quantityLabel: buildLineItemQuantityLabel(item),
          ...detailOptions,
        })
        const lineTotal = item.total ?? item.unit_price * item.quantity
        return (
          <li key={item.id} className="flex gap-3 items-start">
            {thumbnail ? <OrderSummaryThumbnail src={thumbnail} alt={title} /> : null}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between items-start gap-3">
                <p className="font-sans text-sm font-bold text-va-black leading-snug min-w-0 flex-1 line-clamp-2">
                  {title}
                </p>
                <p className="font-sans text-sm font-semibold text-va-black whitespace-nowrap shrink-0">
                  {formatPriceEur(lineTotal)}
                </p>
              </div>
              <CartLineItemDetails blocks={blocks} variant="payment" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Subtotaal / korting / BTW / totaal (with top rule). */
export function OrderSummaryTotalsBlock({ cart, labels }: Pick<CheckoutOrderSummaryProps, 'cart' | 'labels'>) {
  if (!cart || cart.items.length === 0) return null

  const subtotalLabel = labels?.subtotalLabel ?? 'Subtotaal'
  const discountLabel = labels?.discountLabel ?? 'Korting'
  const vatRate = cart.tax_rate ?? vatPercentFromCartLike(cart)
  const vatLabel = labels?.vatLabel ?? vatIncludedLabel(vatRate)
  const totalLabel = labels?.totalLabel ?? 'Totaal'
  const grossSubtotal = grossMerchandiseTotalCents(cart)

  return (
    <div className="border-t border-va-lightgray-300 pt-3 space-y-1.5">
      <div className="flex justify-between font-sans text-xs text-va-darkgray">
        <span>{subtotalLabel}</span>
        <span>{formatPriceEur(grossSubtotal)}</span>
      </div>
      {cart.discount_total > 0 && (
        <div className="flex justify-between font-sans text-xs text-green-700">
          <span>{discountLabel}</span>
          <span>−{formatPriceEur(cart.discount_total)}</span>
        </div>
      )}
      <div className="flex justify-between font-sans text-xs text-va-gray">
        <span>{vatLabel}</span>
        <span>{formatPriceEur(cart.tax_total)}</span>
      </div>
      <div className="flex justify-between font-sans text-sm font-semibold text-va-black border-t border-va-lightgray-300 pt-2 mt-2">
        <span>{totalLabel}</span>
        <span>{formatPriceEur(cart.total)}</span>
      </div>
    </div>
  )
}

/** Line items + subtotal / discount / tax / total (no heading). */
export function OrderSummaryDetails({
  cart,
  labels,
  extras,
}: Pick<CheckoutOrderSummaryProps, 'cart' | 'labels' | 'extras'>) {
  if (!cart || cart.items.length === 0) return null

  return (
    <>
      <OrderSummaryLineItems cart={cart} extras={extras} />
      <OrderSummaryTotalsBlock cart={cart} labels={labels} />
    </>
  )
}

function SummaryContent({
  cart,
  labels,
  extras,
  /** When false, skip title row (e.g. mobile accordion — trigger already shows the heading). */
  showHeadingRow = true,
}: CheckoutOrderSummaryProps & { showHeadingRow?: boolean }) {
  if (!cart || cart.items.length === 0) return null

  const heading = labels?.heading ?? 'Bestellingsoverzicht'
  const changeLabel = labels?.changeLabel ?? 'Wijzigen'

  return (
    <div className="space-y-4">
      {showHeadingRow ? (
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-sm font-semibold text-va-black">{heading}</h2>
          <Link
            href="/winkelwagen"
            className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
          >
            {changeLabel}
          </Link>
        </div>
      ) : (
        <div className="flex justify-end pt-3">
          <Link
            href="/winkelwagen"
            className="font-sans text-xs text-va-darkgray hover:text-va-black underline underline-offset-2 transition-colors"
          >
            {changeLabel}
          </Link>
        </div>
      )}

      <OrderSummaryDetails cart={cart} labels={labels} extras={extras} />
    </div>
  )
}

/** Desktop sticky sidebar — shown inline on lg+ screens */
export function CheckoutOrderSummaryDesktop({ trust, helpContact, ...rest }: CheckoutOrderSummaryProps) {
  return (
    <aside className="hidden lg:block rounded-lg bg-va-lightgray-100 p-5">
      <SummaryContent {...rest} />
      <CheckoutHelpAndTrust trust={trust} helpContact={helpContact} />
    </aside>
  )
}

/** Right column on payment step: Hulp nodig + USPs only (no order lines). */
export function CheckoutOrderSummaryHelpTrustOnly({
  trust,
  helpContact,
}: Pick<CheckoutOrderSummaryProps, 'trust' | 'helpContact'>) {
  return (
    <aside className="rounded-lg bg-va-lightgray-100 p-5">
      <CheckoutHelpAndTrust trust={trust} helpContact={helpContact} topDivider={false} />
    </aside>
  )
}

/** Mobile accordion — shown above the form on small screens */
export function CheckoutOrderSummaryMobile({
  cart,
  labels,
  trust,
  helpContact,
  extras,
}: CheckoutOrderSummaryProps) {
  const [open, setOpen] = useState(false)
  if (!cart || cart.items.length === 0) return null

  return (
    <div className="lg:hidden rounded-lg border border-va-lightgray-300 mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 font-sans text-sm font-medium text-va-black bg-white"
        aria-expanded={open}
      >
        <span>{labels?.heading ?? 'Bestellingsoverzicht'} ({formatPriceEur(cart.total)})</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-white border-t border-va-lightgray-300">
          <SummaryContent cart={cart} labels={labels} extras={extras} showHeadingRow={false} />
        </div>
      )}
      <div className="p-4 bg-va-lightgray-100 border-t border-va-lightgray-300">
        <CheckoutHelpAndTrust trust={trust} helpContact={helpContact} topDivider={false} />
      </div>
    </div>
  )
}
