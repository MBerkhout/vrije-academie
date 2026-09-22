import { addToCartWorkflowId } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  buildEventLineItemMetadata,
  stripReservedEventLineItemMetadata,
} from "../../../../../lib/event-line-item-metadata"
import { ensureCartTaxPreview } from "../../../../../lib/ensure-cart-tax-preview"
import { refetchCart } from "../../../../../lib/medusa-core-imports"
import { vathuisAddToCartPlan } from "../../../../../lib/vathuis-cart-quantity"
import { isVathuisProductMetadata } from "../../../../../modules/salesforce-sync/utils/vathuis-metadata"

type StoreAddCartLineItemBody = {
  variant_id: string
  quantity?: number
  metadata?: Record<string, unknown> | null
  additional_data?: Record<string, unknown>
}

type QueryGraph = {
  graph: (args: {
    entity: string
    fields: string[]
    filters: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

async function loadVathuisAddContext(
  scope: { resolve: (key: string) => unknown },
  cartId: string,
  variantId: string
): Promise<{ isVathuis: boolean; alreadyInCart: boolean }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph

  const [{ data: variants }, { data: carts }] = await Promise.all([
    query.graph({
      entity: "product_variant",
      fields: ["id", "product.metadata"],
      filters: { id: variantId },
    }),
    query.graph({
      entity: "cart",
      fields: ["id", "items.variant_id"],
      filters: { id: cartId },
    }),
  ])

  const variant = variants?.[0] as { product?: { metadata?: Record<string, unknown> | null } } | undefined
  const items = ((carts?.[0] as { items?: { variant_id?: string }[] } | undefined)?.items ?? [])

  return {
    isVathuis: isVathuisProductMetadata(variant?.product?.metadata),
    alreadyInCart: items.some((item) => item.variant_id === variantId),
  }
}

/**
 * POST /store/carts/:id/line-items
 *
 * Overrides core add-to-cart to denormalize event_item facets onto line item
 * metadata for promotion target rules (date range, city). VA Thuis bundles stay
 * at quantity 1 and are not added again when already in the cart.
 */
export async function POST(
  req: MedusaRequest<StoreAddCartLineItemBody>,
  res: MedusaResponse
): Promise<void> {
  const body = req.validatedBody
  const eventMetadata = await buildEventLineItemMetadata(req.scope, body.variant_id)
  const safeMetadata = stripReservedEventLineItemMetadata(body.metadata)
  const vathuisPlan = vathuisAddToCartPlan({
    ...(await loadVathuisAddContext(req.scope, req.params.id, body.variant_id)),
    requestedQuantity: body.quantity,
  })

  if (vathuisPlan.action !== "skip") {
    const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
    await we.run(addToCartWorkflowId, {
      input: {
        cart_id: req.params.id,
        items: [
          {
            ...body,
            quantity: vathuisPlan.quantity,
            metadata: {
              ...safeMetadata,
              ...eventMetadata,
            },
          },
        ],
        additional_data: body.additional_data,
      },
    })

    await ensureCartTaxPreview(req.scope, req.params.id)
  }

  const cart = await refetchCart(req.params.id, req.scope, req.queryConfig.fields)
  res.status(200).json({ cart })
}
