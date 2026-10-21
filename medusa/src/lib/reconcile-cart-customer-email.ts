import type { MedusaContainer } from "@medusajs/framework/types"
import { transferCartCustomerWorkflowId } from "@medusajs/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { getCustomerByEmail } from "./customer-auth/helpers"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * When a cart has both `customer_id` and `email`, the linked customer must match
 * that email. Otherwise checkout can complete on the wrong account (e.g. still
 * logged in as A while the cart email is B).
 */
export async function reconcileCartCustomerWithEmail(
  container: MedusaContainer,
  cartId: string
): Promise<{ changed: boolean; reason?: string }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "email", "customer_id"],
    filters: { id: cartId },
  })

  const cart = carts?.[0] as
    | { id?: string; email?: string | null; customer_id?: string | null }
    | undefined

  if (!cart?.id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart '${cartId}' not found`)
  }

  const cartEmail = cart.email?.trim()
  const customerId = cart.customer_id
  if (!cartEmail || !customerId) {
    return { changed: false }
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string, config?: { select?: string[] }) => Promise<{ id: string; email?: string | null }>
  }

  let linkedEmail: string | null = null
  try {
    const linked = await customerModule.retrieveCustomer(customerId, { select: ["id", "email"] })
    linkedEmail = linked.email ?? null
  } catch {
    linkedEmail = null
  }

  if (linkedEmail && normalizeEmail(linkedEmail) === normalizeEmail(cartEmail)) {
    return { changed: false }
  }

  const emailCustomer = await getCustomerByEmail(container, cartEmail)
  if (emailCustomer?.id) {
    if (emailCustomer.id === customerId) {
      return { changed: false }
    }
    const we = container.resolve(Modules.WORKFLOW_ENGINE)
    await we.run(transferCartCustomerWorkflowId, {
      input: {
        id: cartId,
        customer_id: emailCustomer.id,
      },
    })
    return { changed: true, reason: "transferred_to_email_customer" }
  }

  const cartModule = container.resolve(Modules.CART) as {
    updateCarts: (id: string, data: Record<string, unknown>) => Promise<unknown>
  }
  await cartModule.updateCarts(cartId, { customer_id: null })
  return { changed: true, reason: "detached_mismatched_customer" }
}
