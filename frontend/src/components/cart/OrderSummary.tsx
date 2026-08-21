import type { Cart } from '@/lib/commerce/types'
import { formatPriceEur } from '@/lib/locale-format'

interface OrderSummaryProps {
  cart: Cart
  labels?: {
    subtotal?: string
    discount?: string
    vat?: string
    total?: string
  }
}

export function OrderSummary({ cart, labels }: OrderSummaryProps) {
  const hasDiscount = (cart.discount_total ?? 0) > 0
  const creditCents = (cart as any).credit_line_total ?? 0
  const hasCredit = typeof creditCents === 'number' && creditCents > 0

  return (
    <div className="rounded-lg border border-va-lightgray-300 p-4 font-sans text-sm space-y-2">
      <div className="flex justify-between text-va-darkgray">
        <span>{labels?.subtotal ?? 'Producten'}</span>
        <span>{formatPriceEur(cart.subtotal ?? 0)}</span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between text-va-darkgray">
          <span>{labels?.discount ?? 'Korting'}</span>
          <span className="text-green-700">- {formatPriceEur(cart.discount_total ?? 0)}</span>
        </div>
      )}

      {hasCredit && (
        <div className="flex justify-between text-va-darkgray">
          <span>Cadeaubon / tegoed</span>
          <span className="text-green-700">- {formatPriceEur(creditCents)}</span>
        </div>
      )}

      <div className="flex justify-between text-va-darkgray">
        <span>{labels?.vat ?? 'BTW (21%)'}</span>
        <span>{formatPriceEur(cart.tax_total ?? 0)}</span>
      </div>

      <div className="border-t border-va-lightgray-300 pt-2 flex justify-between font-semibold text-va-black text-base">
        <span>{labels?.total ?? 'Totaal'}</span>
        <span>{formatPriceEur(cart.total ?? 0)}</span>
      </div>
    </div>
  )
}
