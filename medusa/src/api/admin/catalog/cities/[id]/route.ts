import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import CatalogModuleService from "../../../../../modules/catalog/service"

const PatchBodySchema = z.object({
  slug: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  sort_order: z.number().int().optional(),
})

/** Admin: Get, update, or delete a single catalog city. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const [city] = await catalog.listCities({ id: req.params.id })
  if (!city) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `City ${req.params.id} not found`)
  }
  res.json({ city })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PatchBodySchema.parse(req.body)
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const updated = await catalog.updateCities({ id: req.params.id, ...body })
  res.json({ city: updated })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  await catalog.deleteCities(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
