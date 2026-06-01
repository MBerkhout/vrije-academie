import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import productDocentenLink from "../../../../../../links/product-docenten"
import { syncProductById } from "../../../../../../modules/sanity-sync/sync-product-by-id"

const PostBodySchema = z.object({ docent_id: z.string().min(1) })

/** Admin: List, attach, or detach docenten on a product group. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: productDocentenLink.entryPoint,
    fields: ["*", "docent.*"],
    filters: { product_id: req.params.productId },
  })
  const docenten = (data ?? [])
    .map((r: { docent?: unknown }) => r.docent)
    .filter(Boolean)
  res.json({ docenten })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { docent_id } = PostBodySchema.parse(req.body)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [Modules.PRODUCT]: { product_id: req.params.productId },
    people: { docent_id },
  })
  void syncProductById(req.params.productId, req.scope).catch(() => undefined)
  res.status(201).json({ product_id: req.params.productId, docent_id })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const docentId = req.query.docent_id as string
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  await link.dismiss({
    [Modules.PRODUCT]: { product_id: req.params.productId },
    people: { docent_id: docentId },
  })
  void syncProductById(req.params.productId, req.scope).catch(() => undefined)
  res.json({ product_id: req.params.productId, docent_id: docentId, dismissed: true })
}
