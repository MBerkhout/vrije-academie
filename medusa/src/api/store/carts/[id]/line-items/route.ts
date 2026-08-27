import { addToCartWorkflowId } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import {
  buildEventLineItemMetadata,
  stripReservedEventLineItemMetadata,
} from "../../../../../lib/event-line-item-metadata"
import { refetchCart } from "../../../../../lib/medusa-core-imports"

type StoreAddCartLineItemBody = {
  variant_id: string
  quantity?: number
  metadata?: Record<string, unknown> | null
  additional_data?: Record<string, unknown>
}

/**
 * POST /store/carts/:id/line-items
 *
 * Overrides core add-to-cart to denormalize event_item facets onto line item
 * metadata for promotion target rules (date range, city).
 */
export async function POST(
  req: MedusaRequest<StoreAddCartLineItemBody>,
  res: MedusaResponse
): Promise<void> {
  const body = req.validatedBody
  const eventMetadata = await buildEventLineItemMetadata(req.scope, body.variant_id)
  const safeMetadata = stripReservedEventLineItemMetadata(body.metadata)

  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  await we.run(addToCartWorkflowId, {
    input: {
      cart_id: req.params.id,
      items: [
        {
          ...body,
          metadata: {
            ...safeMetadata,
            ...eventMetadata,
          },
        },
      ],
      additional_data: body.additional_data,
    },
  })

  const cart = await refetchCart(req.params.id, req.scope, req.queryConfig.fields)
  res.status(200).json({ cart })
}
