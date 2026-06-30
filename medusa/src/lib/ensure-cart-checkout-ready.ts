import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Event registrations and digital products are not physically shipped.
 * Medusa sets `requires_shipping` on line items when the product has a
 * shipping profile; cart completion then fails without a shipping method.
 */
export async function ensureCartCheckoutReady(
  container: MedusaContainer,
  cartId: string
): Promise<{ updated: number }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cartModule = container.resolve(Modules.CART) as {
    updateLineItems: (
      items: { selector: { id: string }; data: { requires_shipping: boolean } }[]
    ) => Promise<unknown>
  }

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.requires_shipping"],
    filters: { id: cartId },
  })

  const cart = carts?.[0] as
    | { items?: { id: string; requires_shipping?: boolean }[] }
    | undefined

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart '${cartId}' not found`)
  }

  const toFix = (cart.items ?? []).filter((item) => item.requires_shipping === true)
  if (!toFix.length) {
    return { updated: 0 }
  }

  await cartModule.updateLineItems(
    toFix.map((item) => ({
      selector: { id: item.id },
      data: { requires_shipping: false },
    }))
  )

  return { updated: toFix.length }
}
