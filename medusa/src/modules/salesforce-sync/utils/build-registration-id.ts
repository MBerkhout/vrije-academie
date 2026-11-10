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
  lineItemId: string
): string {
  return `${orderId}:${lineItemId}`
}

export function buildOrderItemExternalId(
  orderId: string,
  lineItemId: string,
  kind: "product" | "discount" | "giftcard_purchase" | "voucher_redemption"
): string {
  if (kind === "product") {
    return `${orderId}:${lineItemId}:product`
  }
  if (kind === "discount") {
    return `${orderId}:${lineItemId}:discount`
  }
  return `${orderId}:${lineItemId}:${kind}`
}
