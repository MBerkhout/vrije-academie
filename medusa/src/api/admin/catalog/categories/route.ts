import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import CatalogModuleService from "../../../../modules/catalog/service"

const PostBodySchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  sort_order: z.number().int().optional().default(0),
  image_url: z.string().url().nullable().optional(),
  color: z.string().nullable().optional(),
})

/** Admin: List or create catalog categories. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const categories = await catalog.listCategories({}, { order: { sort_order: "ASC" } })
  res.json({ categories })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PostBodySchema.parse(req.body)
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>

  const category = await catalog.createCategories(body)
  if (!category?.id) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Failed to create category")
  }
  res.status(201).json({ category })
}
