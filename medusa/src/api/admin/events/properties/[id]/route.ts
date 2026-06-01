import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import productPropertiesLink from "../../../../../links/product-properties"
import variantPropertiesLink from "../../../../../links/variant-properties"
import EventsModuleService from "../../../../../modules/events/service"

const PatchBodySchema = z.object({
  key: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
})

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  const body = PatchBodySchema.parse(req.body)
  const events = req.scope.resolve("events") as InstanceType<typeof EventsModuleService>

  const updated = await events.updateProperties([
    { id, ...body },
  ])
  res.json({ property: updated[0] })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  const events = req.scope.resolve("events") as InstanceType<typeof EventsModuleService>
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: prodLinks } = await query.graph({
    entity: productPropertiesLink.entryPoint,
    fields: ["*", "product.*"],
    filters: { property_id: id },
  })

  for (const row of prodLinks ?? []) {
    const r = row as { product_id?: string; property_id?: string }
    if (r.product_id && r.property_id) {
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: r.product_id },
        events: { property_id: r.property_id },
      })
    }
  }

  const { data: varLinks } = await query.graph({
    entity: variantPropertiesLink.entryPoint,
    fields: ["*", "product_variant.*"],
    filters: { property_id: id },
  })

  for (const row of varLinks ?? []) {
    const r = row as { product_variant_id?: string; property_id?: string }
    if (r.product_variant_id && r.property_id) {
      await link.dismiss({
        [Modules.PRODUCT]: { product_variant_id: r.product_variant_id },
        events: { property_id: r.property_id },
      })
    }
  }

  await events.deleteProperties([id])
  res.status(204).send()
}
