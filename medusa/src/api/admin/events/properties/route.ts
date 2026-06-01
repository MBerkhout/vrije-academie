import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import productPropertiesLink from "../../../../links/product-properties"
import variantPropertiesLink from "../../../../links/variant-properties"
import EventsModuleService from "../../../../modules/events/service"

const OwnerSchema = z.enum(["product", "variant"])

const PostBodySchema = z.object({
  owner_type: OwnerSchema,
  owner_id: z.string().min(1),
  key: z.string().min(1),
  value: z.string().min(1),
})

/**
 * List or create `Property` rows for a Product Group (`product`) or Product (`variant`).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const owner_type = req.query.owner_type as string
  const owner_id = req.query.owner_id as string

  const parsed = z
    .object({
      owner_type: OwnerSchema,
      owner_id: z.string().min(1),
    })
    .safeParse({ owner_type, owner_id })

  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Query params owner_type (product|variant) and owner_id are required"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  if (parsed.data.owner_type === "product") {
    const { data } = await query.graph({
      entity: productPropertiesLink.entryPoint,
      fields: ["*", "property.*"],
      filters: { product_id: parsed.data.owner_id },
    })
    const properties = (data ?? [])
      .map((r: { property?: unknown }) => r.property)
      .filter(Boolean)
    res.json({ properties })
    return
  }

  const { data } = await query.graph({
    entity: variantPropertiesLink.entryPoint,
    fields: ["*", "property.*"],
    filters: { product_variant_id: parsed.data.owner_id },
  })
  const properties = (data ?? [])
    .map((r: { property?: unknown }) => r.property)
    .filter(Boolean)
  res.json({ properties })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PostBodySchema.parse(req.body)
  const events = req.scope.resolve("events") as InstanceType<typeof EventsModuleService>
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const [prop] = await events.createProperties([
    { key: body.key, value: body.value },
  ])

  if (!prop?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create property"
    )
  }

  if (body.owner_type === "product") {
    await link.create({
      [Modules.PRODUCT]: { product_id: body.owner_id },
      events: { property_id: prop.id },
    })
  } else {
    await link.create({
      [Modules.PRODUCT]: { product_variant_id: body.owner_id },
      events: { property_id: prop.id },
    })
  }

  res.status(201).json({ property: prop })
}
