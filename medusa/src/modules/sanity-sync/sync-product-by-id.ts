import type { MedusaContainer } from "@medusajs/framework/types"

import { mirrorProduct } from "./service"
import { loadProductMirrorInputs } from "./load-product-mirror-input"

/**
 * Fetches all required data for a product and pushes it to Sanity.
 * Used by the product subscriber, the admin push route, and link mutation routes.
 */
export async function syncProductById(
  productId: string,
  container: MedusaContainer
): Promise<void> {
  const inputs = await loadProductMirrorInputs([productId], container)
  const input = inputs.get(productId)
  if (!input) return
  await mirrorProduct(input)
}
