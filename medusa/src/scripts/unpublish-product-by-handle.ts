import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

/**
 * Set product status to draft (storefront 404).
 *
 *   medusa exec ./src/scripts/unpublish-product-by-handle.ts -- --handle=my-handle
 */
export default async function unpublishProductByHandle({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const handle = arg("--handle")?.trim()
  if (!handle) {
    logger.error("[unpublish-product] Usage: --handle=...")
    return
  }

  const productModule = container.resolve(Modules.PRODUCT)
  const products = await productModule.listProducts({ handle: [handle] }, { select: ["id", "handle", "status", "title"] })
  const product = products[0]
  if (!product) {
    logger.error(`[unpublish-product] No product with handle ${handle}`)
    return
  }

  if (product.status === "draft") {
    logger.info(`[unpublish-product] ${handle} already draft`)
    return
  }

  await productModule.updateProducts(product.id, { status: "draft" })
  logger.info(`[unpublish-product] ${product.title} (${handle}) → draft`)
}