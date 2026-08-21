type MollieAmount = {
  currency: string
  value: string
}

type KlarnaPaymentLine = {
  type: "digital"
  description: string
  quantity: number
  unitPrice: MollieAmount
  totalAmount: MollieAmount
  vatRate: string
  vatAmount: MollieAmount
}

/**
 * Build a single Klarna order line that matches Medusa's payment amount exactly.
 * Uses 0% VAT on the aggregate line to avoid mismatches when cart line tax is unavailable.
 */
export function buildKlarnaOrderLine(
  amount: number | string | { toString(): string },
  currencyCode: string,
  description = "Bestelling Vrije Academie"
): KlarnaPaymentLine[] {
  const currency = currencyCode.toUpperCase()
  const totalValue = parseFloat(amount.toString()).toFixed(2)
  const amountObj: MollieAmount = { currency, value: totalValue }

  return [
    {
      type: "digital",
      description,
      quantity: 1,
      unitPrice: amountObj,
      totalAmount: amountObj,
      vatRate: "0.00",
      vatAmount: { currency, value: "0.00" },
    },
  ]
}
