/**
 * Dump Medusa product metadata for a handle (local verification).
 *   npx medusa exec ./src/scripts/dump-product-metadata.ts -- --handle=art-nouveau
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function dumpProductMetadata({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const handle = arg("--handle")
  if (!handle) {
    logger.info("Usage: --handle=art-nouveau")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "metadata"],
    filters: { handle },
  })

  const product = products?.[0] as Record<string, unknown> | undefined
  if (!product) {
    logger.error(`Product not found: ${handle}`)
    return
  }

  logger.info(JSON.stringify(product, null, 2))
}
