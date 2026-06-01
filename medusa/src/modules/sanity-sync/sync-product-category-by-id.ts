import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { mirrorCategory } from "./service"

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) return null
  for (const key of keys) {
    const v = metadata[key]
    if (typeof v === "string" && v.length > 0) return v
  }
  return null
}

/**
 * Fetches a native Medusa product category and pushes it to Sanity.
 * Used by the product-category subscriber, admin sync route, and resync CLI.
 */
export async function syncProductCategoryById(
  productCategoryId: string,
  container: MedusaContainer
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "rank", "metadata"],
    filters: { id: productCategoryId },
  })

  const category = categories?.[0] as Record<string, unknown> | undefined
  if (!category) return

  const metadata = category.metadata as Record<string, unknown> | null | undefined

  await mirrorCategory({
    id: category.id as string,
    slug: category.handle as string,
    label: category.name as string,
    sort_order: (category.rank as number | null | undefined) ?? 0,
    image_url: metadataString(metadata, "image_url", "imageUrl"),
    color: metadataString(metadata, "color"),
  })
}
