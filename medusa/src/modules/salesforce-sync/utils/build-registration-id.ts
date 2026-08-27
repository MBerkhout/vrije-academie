/** Stable external id for waitlist Registration__c rows (no order). */
export function buildWaitlistRegistrationExternalId(
  customerId: string,
  vaProductId: string
): string {
  return `waitlist:${customerId}:${vaProductId}`
}

/** Stable external id for Registration__c.Medusa_Registration_Id__c */
export function buildRegistrationExternalId(
  orderId: string,
  lineItemId: string,
  seatIndex: number
): string {
  return `${orderId}:${lineItemId}:${seatIndex}`
}

export function buildOrderItemExternalId(
  orderId: string,
  lineItemId: string,
  kind: "product" | "discount" | "giftcard_purchase" | "voucher_redemption",
  seatIndex?: number
): string {
  if (kind === "product" && seatIndex != null) {
    return `${orderId}:${lineItemId}:product:${seatIndex}`
  }
  if (kind === "discount" && seatIndex != null) {
    return `${orderId}:${lineItemId}:discount:${seatIndex}`
  }
  return `${orderId}:${lineItemId}:${kind}`
}
