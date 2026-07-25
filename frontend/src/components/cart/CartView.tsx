'use client'

import { useEffect, useState, useCallback } from 'react'
import { commerceClient } from '@/lib/commerce'
import { dispatchCartUpdated, getActiveCart } from '@/lib/commerce/cart'
import {
  trackApplyCoupon,
  trackCartQuantityChange,
  trackRemoveFromCart,
  trackViewCart,
} from '@/lib/analytics/events/ecommerce'
import { withSortedCartItems } from '@/lib/commerce/cart-sort'
import type { Cart } from '@/lib/commerce/types'
import type { GeneralSettings } from '@/lib/cms/types'
import { appliedDiscountEntriesFromCart, type AppliedDiscountEntry } from '@/lib/commerce/gift-card'
import { CartItemRow, type CartItemExtras } from './CartItemRow'
import { DiscountCodeForm } from './DiscountCodeForm'
import { fetchCartExtras } from '@/lib/commerce/fetch-cart-extras'
import { OrderSummary } from './OrderSummary'
import { TrustSignals } from './TrustSignals'
import { ProceedCta } from './ProceedCta'
import { EmptyCart } from './EmptyCart'
import { CartToast } from './CartToast'
import { defaultMessages } from '@/lib/i18n/messages'

interface CartViewProps {
  settings: GeneralSettings['cart']
}

const contactLinkClass =
  'underline underline-offset-2 decoration-va-lightgray-400 hover:text-va-black'

function telHrefFromDisplay(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length >= 9) return `tel:${digits}`
  return 'tel:'
}

export function CartView({ settings }: CartViewProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [extras, setExtras] = useState<CartItemExtras[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const loadCart = useCallback(async () => {
    try {
      const cartData = await getActiveCart()
      if (!cartData) {
        setCart(null)
        setExtras([])
        setLoading(false)
        return
      }
      const extrasList = await fetchCartExtras(cartData.id)
      setCart(withSortedCartItems(cartData))
      setExtras(extrasList)
      trackViewCart(cartData, extrasList)
    } catch {
      showToast('Kon de winkelwagen niet laden. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  const handleQuantityChange = useCallback(
    async (itemId: string, quantity: number) => {
      if (!cart) return
      const prev = cart
      const line = cart.items.find((i) => i.id === itemId)
      const quantityOld = line?.quantity ?? 0
      setUpdatingId(itemId)
      try {
        let updated = await commerceClient.updateCartItem(cart.id, itemId, quantity)
        try {
          updated = await commerceClient.syncGiftCardCredits(updated.id)
        } catch {
          /* sync is best-effort */
        }
        setCart(withSortedCartItems(updated))
        dispatchCartUpdated()
        const handle = extras.find((e) => e.line_item_id === itemId)?.product_handle ?? itemId
        trackCartQuantityChange(handle, quantityOld, quantity)
      } catch {
        setCart(prev)
        showToast('Kon het aantal niet bijwerken. Probeer het opnieuw.')
      } finally {
        setUpdatingId(null)
      }
    },
    [cart, showToast, extras]
  )

  const handleRemove = useCallback(
    async (itemId: string) => {
      if (!cart) return
      const confirmMsg =
        settings?.labels?.deleteItemConfirm ?? 'Weet je zeker dat je dit product wilt verwijderen?'
      if (!window.confirm(confirmMsg)) return
      const prev = cart
      setUpdatingId(itemId)
      try {
        let updated = await commerceClient.removeFromCart(cart.id, itemId)
        try {
          updated = await commerceClient.syncGiftCardCredits(updated.id)
        } catch {
          /* ignore */
        }
        setCart(withSortedCartItems(updated))
        dispatchCartUpdated()
        trackRemoveFromCart(prev, extras, itemId)
      } catch {
        setCart(prev)
        showToast('Kon het product niet verwijderen. Probeer het opnieuw.')
      } finally {
        setUpdatingId(null)
      }
    },
    [cart, settings, showToast, extras]
  )

  const handleApplyCode = useCallback(
    async (code: string) => {
      if (!cart) return { ok: false as const, error: 'Geen winkelwagen' }
      const promoCodes = ((cart as any).promotions ?? []).map((p: any) => p.code).filter(Boolean)
      try {
        const { cart: next } = await commerceClient.applyCode(cart.id, code, promoCodes)
        setCart(withSortedCartItems(next))
        dispatchCartUpdated()
        trackApplyCoupon(code, next.total)
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: 'Deze code is niet geldig of al gebruikt.' }
      }
    },
    [cart]
  )

  const handleRemoveDiscountEntry = useCallback(
    async (entry: AppliedDiscountEntry) => {
      if (!cart) return
      if (entry.kind === 'promo' && entry.is_automatic === true) return
      try {
        if (entry.kind === 'gift') {
          const updated = await commerceClient.removeGiftCardCode(cart.id, entry.code)
          setCart(withSortedCartItems(updated))
        } else {
          const updated = await commerceClient.removePromoCodes(cart.id, [entry.code])
          setCart(withSortedCartItems(updated))
        }
        dispatchCartUpdated()
      } catch {
        showToast('Kon de code niet verwijderen.')
      }
    },
    [cart, showToast]
  )

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded bg-va-lightgray-200" />
        ))}
      </div>
    )
  }

  const items = cart?.items ?? []
  const isEmpty = items.length === 0

  if (isEmpty) {
    return (
      <EmptyCart
        heading={settings?.emptyHeading}
        subtext={settings?.emptySubtext}
        ctaLabel={settings?.emptyCtaLabel}
        ctaUrl={settings?.emptyCtaUrl}
      />
    )
  }

  const appliedDiscounts = appliedDiscountEntriesFromCart(cart as any)

  return (
    <>
      {toast && <CartToast message={toast} />}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left column: continue link + items + promo */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Column header row — desktop table layout only */}
          <div className="hidden gap-4 border-b border-va-lightgray-300 pb-2 md:flex">
            <div className="w-16 md:w-20 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <span className="font-sans text-xs font-semibold text-va-darkgray">Product</span>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="font-sans text-xs font-semibold text-va-darkgray w-24 text-left whitespace-nowrap">Aantal personen</span>
              <span className="font-sans text-xs font-semibold text-va-darkgray w-16 text-right">Prijs</span>
            </div>
          </div>

          {/* Cart items */}
          <div className="divide-y divide-va-lightgray-300 border-b border-va-lightgray-300">
            {items.map((item) => {
              const itemExtras = extras.find((e) => e.line_item_id === item.id) ?? null
              return (
                <CartItemRow
                  key={item.id}
                  item={item}
                  extras={itemExtras}
                  updating={updatingId === item.id}
                  groupBookingNotice={settings?.labels?.quantityMoreThan12}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                />
              )
            })}
          </div>

          {/* Discount code + contact note (outside bordered card) */}
          <div className="space-y-3">
            <DiscountCodeForm
              applied={appliedDiscounts}
              instructions={settings?.discountCodeInstructions}
              giftCodeNote={settings?.giftCodeNote}
              labels={{
                placeholder: settings?.labels?.discountPlaceholder,
                apply: settings?.labels?.discountApply,
              }}
              onApplyCode={handleApplyCode}
              onRemove={handleRemoveDiscountEntry}
            />
            <p className="font-sans text-xs text-va-darkgray">
              {defaultMessages.cart.discountOrderHelpBeforePhone}
              <a href={telHrefFromDisplay(defaultMessages.cart.discountOrderHelpPhone)} className={contactLinkClass}>
                {defaultMessages.cart.discountOrderHelpPhone}
              </a>
              {defaultMessages.cart.discountOrderHelpAfterPhone}
              <a
                href={`mailto:${defaultMessages.cart.discountOrderHelpEmail}`}
                className={contactLinkClass}
              >
                {defaultMessages.cart.discountOrderHelpEmail}
              </a>
            </p>
          </div>
        </div>

        {/* Right column: order summary + USPs + CTA last (sticky on lg) */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <OrderSummary
              cart={cart!}
              labels={{
                subtotal: settings?.labels?.subtotal,
                discount: settings?.labels?.discount,
                vat: settings?.labels?.vat,
                total: settings?.labels?.total,
              }}
            />
            <TrustSignals
              secure={settings?.trustSecure}
              cancellation={settings?.trustCancellation}
              support={settings?.trustSupport}
              cancellationDays={settings?.cancellationDays}
            />
            <ProceedCta label={settings?.proceedCtaLabel} fullWidth />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — only visible on < md */}
      <div className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-va-lightgray-300 bg-va-white px-4 py-3 shadow-lg">
        <ProceedCta label={settings?.proceedCtaLabel} fullWidth />
      </div>
      {/* Bottom padding so sticky CTA doesn't cover content on mobile */}
      <div className="md:hidden h-20" aria-hidden />
    </>
  )
}
