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
})

/** Admin: List or create catalog cities (plaatsen). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const cities = await catalog.listCities({}, { order: { sort_order: "ASC" } })
  res.json({ cities })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = PostBodySchema.parse(req.body)
  const catalog = req.scope.resolve("catalog") as InstanceType<typeof CatalogModuleService>

  const city = await catalog.createCities(body)
  if (!city?.id) {
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Failed to create city")
  }
  res.status(201).json({ city })
}
