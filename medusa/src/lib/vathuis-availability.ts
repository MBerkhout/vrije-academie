/** VA Thuis bundles are always purchasable — capacity is not enforced. */
export const VATHUIS_UNLIMITED_AVAILABILITY = 999_999

export function isVathuisUnlimitedAvailability(input: {
  recordType?: string | null
  purchaseMode?: string | null
  deliveryType?: string | null
}): boolean {
  return (
    input.recordType === "vathuis" ||
    input.purchaseMode === "bundle_only" ||
    input.deliveryType === "pre_recorded"
  )
}
