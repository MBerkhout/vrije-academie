import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productDocentenLink from "../../../../links/product-docenten"

/**
 * GET /store/cart/extras?cart_id=…
 *
 * Returns per-line-item enriched session data (product handle, thumbnail,
 * event_item fields, instructor names) so the cart page can render rich
 * session details without stuffing metadata into the Medusa cart response.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const cartId = req.query.cart_id as string | undefined

  if (!cartId) {
    res.status(400).json({ message: "cart_id query param is required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch the cart with line items and their variants (including event_item link)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "items.*",
      "items.variant.*",
      "items.variant.product.*",
      "items.variant.event_item.*",
    ],
    filters: { id: cartId },
  })

  const cart = carts?.[0]
  if (!cart) {
    res.status(404).json({ message: "Cart not found" })
    return
  }

  const items: any[] = (cart as any).items ?? []

  // Collect unique product IDs for docent lookup
  const productIds: string[] = [
    ...new Set(
      items
        .map((item: any) => item.variant?.product?.id)
        .filter(Boolean) as string[]
    ),
  ]

  // Fetch docent links for all products in the cart in one query
  const docentsByProductId: Record<string, { name: string }[]> = {}
  if (productIds.length > 0) {
    const { data: docLinks } = await query.graph({
      entity: productDocentenLink.entryPoint,
      fields: ["product_id", "docent.name"],
      filters: { product_id: productIds },
    })
    for (const link of (docLinks ?? []) as any[]) {
      const pid = link.product_id as string
      if (!docentsByProductId[pid]) docentsByProductId[pid] = []
      if (link.docent?.name) {
        docentsByProductId[pid].push({ name: link.docent.name })
      }
    }
  }

  const extras = items.map((item: any) => {
    const variant = item.variant ?? {}
    const product = variant.product ?? {}
    const eventItem = variant.event_item ?? null

    return {
      line_item_id: item.id as string,
      product_id: product.id ?? null,
      product_handle: product.handle ?? null,
      product_title: product.title ?? null,
      thumbnail: product.thumbnail ?? null,
      event_item: eventItem
        ? {
            delivery_type: eventItem.delivery_type ?? null,
            start_at: eventItem.start_at ?? null,
            end_at: eventItem.end_at ?? null,
            city: eventItem.city ?? null,
          }
        : null,
      instructor_names: (docentsByProductId[product.id] ?? []).map(
        (d: any) => d.name
      ),
    }
  })

  res.json({ extras })
}
