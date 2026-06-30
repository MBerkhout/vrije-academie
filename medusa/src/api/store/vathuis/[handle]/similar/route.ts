import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getVathuisRecommendations } from "../../../../../lib/vathuis-recommendations"

/**
 * GET /store/vathuis/:handle/similar
 * Up to 4 related VA Thuis products in the same catalog category, sorted by registrations.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle },
  })

  const currentProduct = products?.[0] as { id: string; handle?: string } | undefined
  if (!currentProduct?.id) {
    res.status(404).json({ message: "Event not found" })
    return
  }

  const similar = await getVathuisRecommendations(req.scope, {
    excludeProductIds: [currentProduct.id],
    similarToHandle: handle,
  })

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")
  res.json({ similar })
}
