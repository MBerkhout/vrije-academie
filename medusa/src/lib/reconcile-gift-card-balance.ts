/** Never raise Medusa balance from Salesforce; only accept a lower remaining amount. */
export function reconcileGiftCardBalanceWithSalesforce(
  localBalanceCents: number,
  salesforceBalanceCents: number
): number {
  const local = Math.max(0, Math.round(localBalanceCents))
  const sf = Math.max(0, Math.round(salesforceBalanceCents))
  return Math.min(local, sf)
}
