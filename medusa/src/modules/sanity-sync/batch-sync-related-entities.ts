import type { MedusaContainer } from "@medusajs/framework/types"

import CatalogModuleService from "../catalog/service"
import PeopleModuleService from "../people/service"
import { mirrorCategory, mirrorDocent } from "./service"
import { syncProductCategoryById } from "./sync-product-category-by-id"

export type BatchSyncRelatedEntitiesResult = {
  catalogCategories: number
  nativeCategories: number
  docenten: number
  failed: number
}

/** Deferred Sanity mirrors for catalog/native categories and docenten after bulk import. */
export async function batchSyncRelatedEntitiesToSanity(
  container: MedusaContainer,
  options: {
    catalogCategoryIds: string[]
    nativeCategoryIds: string[]
    docentIds: string[]
    onError?: (entity: string, id: string, err: Error) => void
  }
): Promise<BatchSyncRelatedEntitiesResult> {
  const result: BatchSyncRelatedEntitiesResult = {
    catalogCategories: 0,
    nativeCategories: 0,
    docenten: 0,
    failed: 0,
  }

  const catalog = container.resolve("catalog") as InstanceType<typeof CatalogModuleService>
  const people = container.resolve("people") as InstanceType<typeof PeopleModuleService>

  for (const categoryId of options.catalogCategoryIds) {
    try {
      const [category] = await catalog.listCategories({ id: categoryId })
      if (!category) continue
      await mirrorCategory(category)
      result.catalogCategories += 1
    } catch (err) {
      result.failed += 1
      options.onError?.(
        "catalog-category",
        categoryId,
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }

  for (const categoryId of options.nativeCategoryIds) {
    try {
      await syncProductCategoryById(categoryId, container)
      result.nativeCategories += 1
    } catch (err) {
      result.failed += 1
      options.onError?.(
        "native-category",
        categoryId,
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }

  for (const docentId of options.docentIds) {
    try {
      const [docent] = await people.listDocents({ id: docentId })
      if (!docent) continue
      await mirrorDocent({
        ...docent,
        subject_tags: Array.isArray(docent.subject_tags)
          ? (docent.subject_tags as unknown as string[])
          : null,
      })
      result.docenten += 1
    } catch (err) {
      result.failed += 1
      options.onError?.(
        "docent",
        docentId,
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }

  return result
}
