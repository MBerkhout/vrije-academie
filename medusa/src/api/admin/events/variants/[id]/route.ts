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

import variantEventItemLink from "../../../../../links/variant-event-item"
import EventsModuleService from "../../../../../modules/events/service"
import CatalogModuleService from "../../../../../modules/catalog/service"
import { applyCityToEventItemPatch } from "../../../../../lib/resolve-city"
import {
  DELIVERY_TYPES,
  type DeliveryType,
} from "../../../../../modules/events/types"

const PatchBodySchema = z
  .object({
    delivery_type: z
      .enum(DELIVERY_TYPES as unknown as [string, ...string[]])
      .optional(),
    available_quantity: z.number().int().min(0).optional(),
    start_at: z.string().datetime({ offset: true }).nullable().optional(),
    end_at: z.string().datetime({ offset: true }).nullable().optional(),
    city: z.string().nullable().optional(),
    registration_deadline_at: z.string().datetime({ offset: true }).nullable().optional(),
    is_free_trial: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.delivery_type !== undefined ||
      b.available_quantity !== undefined ||
      b.start_at !== undefined ||
      b.end_at !== undefined ||
      b.city !== undefined ||
      b.registration_deadline_at !== undefined ||
      b.is_free_trial !== undefined,
    { message: "Provide at least one field to update" }
  )

/**
 * Admin: Product (`ProductVariant`) — `delivery_type` and `available_quantity` on `EventItem`.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const variantId = req.params.id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: variantEventItemLink.entryPoint,
    fields: ["*", "event_item.*", "product_variant.*"],
    filters: { product_variant_id: variantId },
  })

  const row = data?.[0] as
    | { event_item?: Record<string, unknown> }
    | undefined

  res.json({
    variant_id: variantId,
    event_item: row?.event_item ?? null,
  })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const variantId = req.params.id as string
  const body = PatchBodySchema.parse(req.body)

  const events = req.scope.resolve("events") as InstanceType<typeof EventsModuleService>
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: variantEventItemLink.entryPoint,
    fields: ["*", "event_item.*"],
    filters: { product_variant_id: variantId },
  })

  const row = existing?.[0] as { event_item?: { id: string } } | undefined

  const productModule = req.scope.resolve(Modules.PRODUCT)

  if (row?.event_item?.id) {
    const patch: {
      id: string
      delivery_type?: DeliveryType
      available_quantity?: number
      start_at?: Date | null
      end_at?: Date | null
      city?: string | null
    city_slug?: string | null
      registration_deadline_at?: Date | null
      is_free_trial?: boolean
    } = { id: row.event_item.id }
    if (body.delivery_type !== undefined) {
      patch.delivery_type = body.delivery_type as DeliveryType
    }
    if (body.available_quantity !== undefined) {
      patch.available_quantity = body.available_quantity
    }
    if (body.start_at !== undefined) patch.start_at = body.start_at ? new Date(body.start_at) : null
    if (body.end_at !== undefined) patch.end_at = body.end_at ? new Date(body.end_at) : null
    if (body.city !== undefined) {
      const cityFields = await applyCityToEventItemPatch(catalog, body.city)
      patch.city = cityFields.city
      patch.city_slug = cityFields.city_slug
    }
    if (body.registration_deadline_at !== undefined) {
      patch.registration_deadline_at = body.registration_deadline_at ? new Date(body.registration_deadline_at) : null
    }
    if (body.is_free_trial !== undefined) patch.is_free_trial = body.is_free_trial
    const updated = await events.updateEventItems(patch)
    await productModule.updateProductVariants(variantId, {
      manage_inventory: false,
    })
    res.json({ event_item: updated })
    return
  }

  const delivery = (body.delivery_type ?? "online") as DeliveryType
  const qty = body.available_quantity ?? 0

  const cityFields =
    body.city !== undefined ? await applyCityToEventItemPatch(catalog, body.city) : null

  const eventItem = await events.createEventItems({
    delivery_type: delivery,
    available_quantity: qty,
    ...(body.start_at !== undefined ? { start_at: body.start_at ? new Date(body.start_at) : null } : {}),
    ...(body.end_at !== undefined ? { end_at: body.end_at ? new Date(body.end_at) : null } : {}),
    ...(cityFields
      ? { city: cityFields.city, city_slug: cityFields.city_slug }
      : body.city !== undefined
        ? { city: body.city, city_slug: null }
        : {}),
    ...(body.registration_deadline_at !== undefined
      ? { registration_deadline_at: body.registration_deadline_at ? new Date(body.registration_deadline_at) : null }
      : {}),
    ...(body.is_free_trial !== undefined ? { is_free_trial: body.is_free_trial } : {}),
  })
  if (!eventItem?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create event item"
    )
  }

  await link.create({
    [Modules.PRODUCT]: { product_variant_id: variantId },
    events: { event_item_id: eventItem.id },
  })

  await productModule.updateProductVariants(variantId, {
    manage_inventory: false,
  })

  res.json({ event_item: eventItem })
}
