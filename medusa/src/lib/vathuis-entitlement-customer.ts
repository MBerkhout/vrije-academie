import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getCustomerByEmail } from "./customer-auth/helpers"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * VA Thuis access is keyed by Medusa `customer_id`. Prefer the customer that
 * matches `order.email` when it differs from `order.customer_id` (checkout
 * email / account mismatch).
 */
export async function resolveVathuisEntitlementCustomerId(
  container: MedusaContainer,
  orderId: string
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "email"],
    filters: { id: orderId },
  })

  const order = orders?.[0] as
    | { customer_id?: string | null; email?: string | null }
    | undefined

  if (!order) return null

  const orderCustomerId = order.customer_id ?? null
  const orderEmail = order.email?.trim()

  if (!orderEmail) {
    return orderCustomerId
  }

  let emailCustomerId: string | null = null
  try {
    const emailCustomer = await getCustomerByEmail(container, orderEmail)
    emailCustomerId = emailCustomer?.id ?? null
  } catch {
    emailCustomerId = null
  }

  if (emailCustomerId) {
    if (orderCustomerId && emailCustomerId !== orderCustomerId) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
        warn: (msg: string) => void
      }
      logger.warn(
        `[vathuis-access] order ${orderId}: customer_id ${orderCustomerId} does not match order email ${normalizeEmail(orderEmail)}; granting to ${emailCustomerId}`
      )
    }
    return emailCustomerId
  }

  return orderCustomerId
}
