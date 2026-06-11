import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SearchModuleService from "../modules/search/service"
import { isOpenSearchConfigured } from "../modules/search/client"

/**
 * Full rebuild of the unified OpenSearch index (commerce + Sanity pages/persons).
 *
 * Run: npm run search:reindex
 */
export default async function reindexSearch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isOpenSearchConfigured()) {
    logger.warn("OPENSEARCH_NODE is not set — skipping search reindex.")
    return
  }

  const search = container.resolve("search") as InstanceType<typeof SearchModuleService>
  const { commerce, sanity } = await search.fullReindex(container)

  logger.info(
    `Search reindex complete: ${commerce} commerce docs, ${sanity} Sanity docs (index: ${process.env.SEARCH_INDEX ?? "va-search"}).`
  )
}
