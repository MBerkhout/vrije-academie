import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import productCategoriesLink from "../links/product-categories"
import CatalogModuleService from "../modules/catalog/service"

export type CatalogCategoryRef = {
  id: string
  slug: string
  label: string
  sort_order?: number
  image_url?: string | null
  color?: string | null
}

export type ProductCatalogCategoryLink = {
  product_id: string
  catalog_category_id: string
  catalog_category: CatalogCategoryRef | null
}

/** Load product ↔ catalog category links without graph expand (custom catalog module). */
export async function listProductCatalogCategoryLinks(
  container: MedusaContainer,
  filters?: { product_id?: string | string[] }
): Promise<ProductCatalogCategoryLink[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>

  const { data: linkRows } = await query.graph({
    entity: productCategoriesLink.entryPoint,
    fields: ["product_id", "catalog_category_id"],
    ...(filters?.product_id ? { filters: { product_id: filters.product_id } } : {}),
  })

  const categoryIds = [
    ...new Set(
      (linkRows ?? [])
        .map((r) => (r as { catalog_category_id?: string }).catalog_category_id)
        .filter(Boolean) as string[]
    ),
  ]

  const categories = categoryIds.length
    ? await catalog.listCategories({ id: categoryIds })
    : []
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (linkRows ?? [])
    .map((row) => {
      const r = row as { product_id?: string; catalog_category_id?: string }
      const cat = r.catalog_category_id ? categoryById.get(r.catalog_category_id) : undefined
      return {
        product_id: r.product_id ?? "",
        catalog_category_id: r.catalog_category_id ?? "",
        catalog_category: cat
          ? {
              id: cat.id,
              slug: cat.slug,
              label: cat.label,
              sort_order: cat.sort_order,
              image_url: cat.image_url,
              color: cat.color,
            }
          : null,
      }
    })
    .filter((r) => r.product_id && r.catalog_category_id)
}

export function categoriesByProductId(
  links: ProductCatalogCategoryLink[]
): Record<string, CatalogCategoryRef[]> {
  const map: Record<string, CatalogCategoryRef[]> = {}
  for (const row of links) {
    if (!row.product_id || !row.catalog_category) continue
    ;(map[row.product_id] ??= []).push(row.catalog_category)
  }
  return map
}

export async function listCategoriesForProductIds(
  container: MedusaContainer,
  productIds: string | string[]
): Promise<{
  links: ProductCatalogCategoryLink[]
  byProductId: Record<string, CatalogCategoryRef[]>
}> {
  const links = await listProductCatalogCategoryLinks(container, { product_id: productIds })
  return { links, byProductId: categoriesByProductId(links) }
}
