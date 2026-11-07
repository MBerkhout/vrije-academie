import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const GTM_PURCHASE_SENT_AT = "gtm_purchase_sent_at"
export const GTM_REFUND_SENT_AT = "gtm_refund_sent_at"
export const GTM_SIGN_UP_SENT_AT = "gtm_sign_up_sent_at"

export async function hasOrderMetadataFlag(
  container: MedusaContainer,
  orderId: string,
  key: string
): Promise<boolean> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "metadata"] })
  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  return Boolean(metadata[key])
}

export async function markOrderMetadataFlag(
  container: MedusaContainer,
  orderId: string,
  key: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "metadata"] })
  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  await orderModule.updateOrders(orderId, {
    metadata: {
      ...metadata,
      [key]: new Date().toISOString(),
    },
  })
}

export async function hasCustomerMetadataFlag(
  container: MedusaContainer,
  customerId: string,
  key: string
): Promise<boolean> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  return Boolean(metadata[key])
}

export async function markCustomerMetadataFlag(
  container: MedusaContainer,
  customerId: string,
  key: string
): Promise<void> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...metadata,
      [key]: new Date().toISOString(),
    },
  })
}
