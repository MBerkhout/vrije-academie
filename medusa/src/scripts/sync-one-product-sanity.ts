import type { ExecArgs } from "@medusajs/framework/types"

import { syncProductById } from "../modules/sanity-sync/sync-product-by-id"

export default async function syncOneProductSanity({ container }: ExecArgs) {
  const productId = process.argv.find((arg) => arg.startsWith("prod_")) ?? process.argv.at(-1)
  if (!productId?.startsWith("prod_")) {
    throw new Error("Usage: medusa exec ./src/scripts/sync-one-product-sanity.ts -- prod_...")
  }

  await syncProductById(productId, container)
  console.log(`[sync-one-product-sanity] Synced ${productId}`)
}
