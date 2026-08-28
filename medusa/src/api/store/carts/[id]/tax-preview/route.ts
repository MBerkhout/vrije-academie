import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ensureCartTaxPreview } from "../../../../../lib/ensure-cart-tax-preview"
import { defaultStoreCartFields, refetchCart } from "../../../../../lib/medusa-core-imports"

/**
 * POST /store/carts/:id/tax-preview
 *
 * Sets a default shipping country (NL) when needed so Medusa can extract included VAT
 * (respecting product-type rules such as BTW laag) before checkout address entry.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const cartId = req.params.id
  if (!cartId) {
    res.status(400).json({ message: "Cart id is required" })
    return
  }

  try {
    const { updated } = await ensureCartTaxPreview(req.scope, cartId)
    const fields = req.queryConfig?.fields ?? defaultStoreCartFields
    const cart = await refetchCart(cartId, req.scope, fields)
    res.status(200).json({ cart, updated })
  } catch (e: unknown) {
    if (e instanceof MedusaError) {
      res.status(e.type === MedusaError.Types.NOT_FOUND ? 404 : 400).json({
        message: e.message,
      })
      return
    }
    throw e
  }
}
