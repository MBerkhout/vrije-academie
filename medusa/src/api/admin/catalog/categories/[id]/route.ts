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
  image_url: z.string().url().nullable().optional(),
  color: z.string().nullable().optional(),
})

/** Admin: Get, update, or delete a single catalog category. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const [category] = await catalog.listCategories({ id: req.params.id })
  if (!category) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Category ${req.params.id} not found`)
  }
  res.json({ category })
}

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PatchBodySchema.parse(req.body)
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const updated = await catalog.updateCategories({ id: req.params.id, ...body })
  res.json({ category: updated })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  await catalog.deleteCategories(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
