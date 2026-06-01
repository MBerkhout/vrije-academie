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

import productEventGroupLink from "../../../../../links/product-event-group"
import EventsModuleService from "../../../../../modules/events/service"
import {
  RECORD_TYPES,
  type RecordType,
} from "../../../../../modules/events/types"

const PatchBodySchema = z.object({
  record_type: z.enum(RECORD_TYPES as unknown as [string, ...string[]]).optional(),
  has_free_trial: z.boolean().optional(),
  /** When false, product is hidden from storefront Ons aanbod (`GET /store/events`). */
  show_in_plp: z.boolean().optional(),
}).refine(
  (b) =>
    b.record_type !== undefined ||
    b.has_free_trial !== undefined ||
    b.show_in_plp !== undefined,
  { message: "Provide at least one field to update" }
)

/**
 * Admin: Product Group (`Product`) — `record_type` on linked `EventGroup`.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["*", "event_group.*", "product.*"],
    filters: { product_id: productId },
  })

  const row = data?.[0] as
    | { event_group?: Record<string, unknown>; product?: Record<string, unknown> }
    | undefined

  res.json({
    product_id: productId,
    event_group: row?.event_group ?? null,
  })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id as string
  const body = PatchBodySchema.parse(req.body)

  const events = req.scope.resolve("events") as InstanceType<typeof EventsModuleService>
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: productEventGroupLink.entryPoint,
    fields: ["*", "event_group.*"],
    filters: { product_id: productId },
  })

  const row = existing?.[0] as { event_group?: { id: string } } | undefined

  if (row?.event_group?.id) {
    const patch: {
      id: string
      record_type?: RecordType
      has_free_trial?: boolean
      show_in_plp?: boolean
    } = {
      id: row.event_group.id,
    }
    if (body.record_type !== undefined) patch.record_type = body.record_type as RecordType
    if (body.has_free_trial !== undefined) patch.has_free_trial = body.has_free_trial
    if (body.show_in_plp !== undefined) patch.show_in_plp = body.show_in_plp
    const updated = await events.updateEventGroups(patch)
    res.json({ event_group: updated })
    return
  }

  const eventGroup = await events.createEventGroups({
    record_type: (body.record_type ?? "collegereeks") as RecordType,
    has_free_trial: body.has_free_trial ?? false,
    show_in_plp: body.show_in_plp ?? true,
  })
  if (!eventGroup?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create event group"
    )
  }

  await link.create({
    [Modules.PRODUCT]: { product_id: productId },
    events: { event_group_id: eventGroup.id },
  })

  res.json({ event_group: eventGroup })
}
