import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

import {
  mergeWishlistHandles,
  parseWishlistHandles,
  SF_FAVOURITES_HASH_METADATA_KEY,
  WISHLIST_METADATA_KEY,
  wishlistHandlesEqual,
} from "../../../lib/customer-wishlist"
import type { FavouriteFieldLayout } from "../mappings/favourite"
import { resolveFavouriteFieldLayout, SF_FAVOURITE_OBJECT } from "../mappings/favourite"
import SalesforceSyncModuleService from "../service"
import { favouritesWishlistFingerprint } from "./favourites-fingerprint"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function productFieldNames(layout: FavouriteFieldLayout): string[] {
  const names: string[] = []
  if (layout.productgroupField) names.push(layout.productgroupField)
  if (layout.productField) names.push(layout.productField)
  return names
}

function readProductgroupIdFromRow(
  row: Record<string, unknown>,
  layout: FavouriteFieldLayout
): string | null {
  const fromGroup = layout.productgroupField
    ? String(row[layout.productgroupField] ?? "").trim()
    : ""
  if (fromGroup) return fromGroup

  const fromProduct = layout.productField ? String(row[layout.productField] ?? "").trim() : ""
  if (!fromProduct) return null

  return fromProduct
}

async function productgroupIdToHandle(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  productService: {
    retrieveProduct: (id: string, config?: { select?: string[] }) => Promise<{ handle?: string }>
  },
  productgroupOrProductSfId: string
): Promise<string | null> {
  let medusaProductId =
    (await sync.getStateBySalesforceId("productgroup", productgroupOrProductSfId))?.medusa_id ?? null
  if (!medusaProductId) {
    medusaProductId =
      (await sync.getStateBySalesforceId("product", productgroupOrProductSfId))?.medusa_id ?? null
  }
  if (!medusaProductId) return null

  try {
    const product = await productService.retrieveProduct(medusaProductId, { select: ["handle"] })
    const handle = product.handle?.trim()
    return handle || null
  } catch {
    return null
  }
}

export type PullFavouritesResult = {
  skipped: boolean
  mergedHandles: string[]
  updated: boolean
}

/**
 * Query Favourite__c for a Contact and merge handles into customer.metadata.va_wishlist.
 */
export async function pullFavouritesFromSalesforce(
  container: MedusaContainer,
  customerId: string,
  contactId: string,
  accountId?: string | null
): Promise<PullFavouritesResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) {
    return { skipped: true, mergedHandles: [], updated: false }
  }

  const layout = await resolveFavouriteFieldLayout()
  if (!layout) {
    return { skipped: true, mergedHandles: [], updated: false }
  }

  const select = ["Id", ...productFieldNames(layout)].filter(Boolean).join(", ")
  let where = ""
  if (layout.contactField && contactId) {
    where = `${layout.contactField} = '${escapeSoql(contactId)}'`
  } else if (layout.accountField && accountId) {
    where = `${layout.accountField} = '${escapeSoql(accountId)}'`
  }
  if (!where) return { skipped: true, mergedHandles: [], updated: false }

  const soql = `SELECT ${select} FROM ${SF_FAVOURITE_OBJECT} WHERE ${where} LIMIT 500`
  const { records } = await sync.query<Record<string, unknown>>(soql)

  const productService = container.resolve(Modules.PRODUCT)
  const remoteHandles: string[] = []
  for (const row of records) {
    const sfProductRef = readProductgroupIdFromRow(row, layout)
    if (!sfProductRef) continue
    const handle = await productgroupIdToHandle(sync, productService, sfProductRef)
    if (handle) remoteHandles.push(handle)
  }

  const customerService = container.resolve(Modules.CUSTOMER)
  const [customer] = await customerService.listCustomers({ id: customerId }, { take: 1 })
  if (!customer) {
    return { skipped: true, mergedHandles: [], updated: false }
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const current = parseWishlistHandles(metadata)
  const merged = mergeWishlistHandles(current, remoteHandles)
  const fp = favouritesWishlistFingerprint(merged)
  const hashMatches =
    typeof metadata[SF_FAVOURITES_HASH_METADATA_KEY] === "string" &&
    metadata[SF_FAVOURITES_HASH_METADATA_KEY] === fp

  if (wishlistHandlesEqual(current, merged) && hashMatches) {
    return { skipped: false, mergedHandles: merged, updated: false }
  }

  await updateCustomersWorkflow(container).run({
    input: {
      selector: { id: [customerId] },
      update: {
        metadata: {
          ...metadata,
          [WISHLIST_METADATA_KEY]: merged,
          [SF_FAVOURITES_HASH_METADATA_KEY]: fp,
        },
      },
    },
  })

  return { skipped: false, mergedHandles: merged, updated: true }
}
