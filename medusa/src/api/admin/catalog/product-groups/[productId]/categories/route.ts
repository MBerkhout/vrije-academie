import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { listProductCatalogCategoryLinks } from "../../../../../../lib/product-catalog-category-links"
import { syncProductById } from "../../../../../../modules/sanity-sync/sync-product-by-id"

const PostBodySchema = z.object({ category_id: z.string().min(1) })

/** Admin: List, attach, or detach catalog categories on a product group. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const links = await listProductCatalogCategoryLinks(req.scope, {
    product_id: req.params.productId,
  })
  const categories = links
    .map((r) => r.catalog_category)
    .filter(Boolean)
  res.json({ categories })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { category_id } = PostBodySchema.parse(req.body)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [Modules.PRODUCT]: { product_id: req.params.productId },
    catalog: { catalog_category_id: category_id },
  })
  void syncProductById(req.params.productId, req.scope).catch(() => undefined)
  res.status(201).json({ product_id: req.params.productId, category_id })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const categoryId = req.query.category_id as string
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  await link.dismiss({
    [Modules.PRODUCT]: { product_id: req.params.productId },
    catalog: { catalog_category_id: categoryId },
  })
  void syncProductById(req.params.productId, req.scope).catch(() => undefined)
  res.json({ product_id: req.params.productId, category_id: categoryId, dismissed: true })
}
