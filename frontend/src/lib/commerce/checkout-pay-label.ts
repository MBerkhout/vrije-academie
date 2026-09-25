import { formatPriceEur } from '@/lib/locale-format'

/** Payment CTA: “Betaal € …” when an amount is due, “Bestelling plaatsen” at €0. */
export function checkoutPayButtonLabel(input: {
  busy: boolean
  /** Cart total in cents. `null` when the cart is not loaded yet. */
  total: number | null
}): string {
  const isFree = input.total != null && input.total <= 0
  if (input.busy) return isFree ? 'Bestelling plaatsen…' : 'Betaling starten…'
  if (isFree) return 'Bestelling plaatsen'
  if (input.total == null) return 'Betaal'
  return `Betaal ${formatPriceEur(input.total, 'standard')}`
}
