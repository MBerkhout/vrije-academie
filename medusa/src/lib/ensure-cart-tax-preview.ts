import { updateCartWorkflowId } from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

/** Default country for included-VAT preview (NL product-type rules incl. BTW laag). */
const DEFAULT_TAX_COUNTRY = "nl"

function isGiftcardLine(item: {
  is_giftcard?: boolean
  metadata?: Record<string, unknown> | null
}): boolean {
  if (item.is_giftcard === true) return true
  const meta = item.metadata
  return meta != null && typeof meta === "object" && meta.gift_card != null
}

/**
 * Ensures Medusa can calculate included VAT on storefront carts before checkout.
 * Sets a minimal shipping country when missing, or re-runs tax when country exists but tax_total is still 0.
 */
export async function ensureCartTaxPreview(
  container: MedusaContainer,
  cartId: string
): Promise<{ updated: boolean }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "shipping_address.country_code",
      "items.id",
      "items.is_giftcard",
      "items.metadata",
    ],
    filters: { id: cartId },
  })

  const cart = carts?.[0] as
    | {
        id: string
        shipping_address?: { country_code?: string | null } | null
        items?: { id: string; is_giftcard?: boolean; metadata?: Record<string, unknown> | null }[]
      }
    | undefined

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart '${cartId}' not found`)
  }

  if (!cart.items?.length) {
    return { updated: false }
  }

  const hasCatalogLine = cart.items.some((item) => !isGiftcardLine(item))
  if (!hasCatalogLine) {
    return { updated: false }
  }

  const country = cart.shipping_address?.country_code?.trim()

  if (country) {
    return { updated: false }
  }

  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(updateCartWorkflowId, {
    input: {
      id: cartId,
      shipping_address: {
        country_code: DEFAULT_TAX_COUNTRY,
      },
    },
  })

  return { updated: true }
}
