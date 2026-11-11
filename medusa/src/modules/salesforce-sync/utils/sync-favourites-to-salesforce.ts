import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

import {
  parseWishlistHandles,
  SF_FAVOURITES_HASH_METADATA_KEY,
  WISHLIST_METADATA_KEY,
} from "../../../lib/customer-wishlist"
import {
  favouriteRowToSalesforce,
  resolveFavouriteFieldLayout,
  SF_FAVOURITE_OBJECT,
  type FavouriteFieldLayout,
} from "../mappings/favourite"
import SalesforceSyncModuleService from "../service"
import { filterFieldsForConnectedOrg } from "./salesforce-describe-fields"
import { favouritesWishlistFingerprint } from "./favourites-fingerprint"
import { resolveProductgroupIdsFromHandles } from "./resolve-wishlist-productgroup-ids"

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function productKeyFromRow(row: Record<string, unknown>, layout: FavouriteFieldLayout): string | null {
  if (layout.productgroupField) {
    const id = String(row[layout.productgroupField] ?? "").trim()
    if (id) return `pg:${id}`
  }
  if (layout.productField) {
    const id = String(row[layout.productField] ?? "").trim()
    if (id) return `p:${id}`
  }
  return null
}

async function queryExistingFavourites(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  layout: FavouriteFieldLayout,
  contactId: string,
  accountId: string | null
): Promise<Array<{ Id: string; row: Record<string, unknown> }>> {
  const productFields = [
    layout.productgroupField,
    layout.productField,
  ].filter((x): x is string => !!x)
  const select = ["Id", ...productFields].join(", ")

  let where = ""
  if (layout.contactField) {
    where = `${layout.contactField} = '${escapeSoql(contactId)}'`
  } else if (layout.accountField && accountId) {
    where = `${layout.accountField} = '${escapeSoql(accountId)}'`
  }
  if (!where) return []

  const soql = `SELECT ${select} FROM ${SF_FAVOURITE_OBJECT} WHERE ${where} LIMIT 500`
  const { records } = await sync.query<Record<string, unknown> & { Id: string }>(soql)
  return records.map((row) => ({ Id: row.Id, row }))
}

export type SyncFavouritesToSalesforceResult = {
  skipped: boolean
  created: number
  deleted: number
}

export async function syncFavouritesToSalesforce(
  container: MedusaContainer,
  customerId: string,
  contactId: string,
  accountId: string | null
): Promise<SyncFavouritesToSalesforceResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) {
    return { skipped: true, created: 0, deleted: 0 }
  }

  const layout = await resolveFavouriteFieldLayout()
  if (!layout) return { skipped: true, created: 0, deleted: 0 }

  const customerService = container.resolve(Modules.CUSTOMER)
  const [customer] = await customerService.listCustomers({ id: customerId }, { take: 1 })
  if (!customer) return { skipped: true, created: 0, deleted: 0 }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const handles = parseWishlistHandles(metadata)
  const fingerprint = favouritesWishlistFingerprint(handles)
  const storedHash = metadata[SF_FAVOURITES_HASH_METADATA_KEY]
  if (typeof storedHash === "string" && storedHash === fingerprint) {
    return { skipped: true, created: 0, deleted: 0 }
  }

  const resolved = await resolveProductgroupIdsFromHandles(container, handles)
  const desiredProductgroupIds = new Set<string>()
  for (const h of handles) {
    const row = resolved.get(h)
    if (row?.productgroupSalesforceId) desiredProductgroupIds.add(row.productgroupSalesforceId)
  }

  const existing = await queryExistingFavourites(sync, layout, contactId, accountId)
  const existingByProduct = new Map<string, string>()
  for (const { Id, row } of existing) {
    const key = productKeyFromRow(row, layout)
    if (!key) continue
    const sfPg =
      layout.productgroupField && row[layout.productgroupField]
        ? String(row[layout.productgroupField]).trim()
        : ""
    if (sfPg) existingByProduct.set(`pg:${sfPg}`, Id)
    const sfProd =
      layout.productField && row[layout.productField]
        ? String(row[layout.productField]).trim()
        : ""
    if (sfProd) existingByProduct.set(`p:${sfProd}`, Id)
  }

  let created = 0
  let deleted = 0

  for (const pgId of desiredProductgroupIds) {
    const key = `pg:${pgId}`
    if (existingByProduct.has(key)) continue
    const fields = favouriteRowToSalesforce(layout, {
      contactId,
      accountId,
      productgroupId: layout.productgroupField ? pgId : null,
      productId: layout.productField && !layout.productgroupField ? pgId : null,
    })
    const writable = await filterFieldsForConnectedOrg(SF_FAVOURITE_OBJECT, fields, "create")
    if (!Object.keys(writable).length) continue
    await sync.createRecord(SF_FAVOURITE_OBJECT, writable)
    created++
  }

  for (const [key, sfId] of existingByProduct) {
    if (!key.startsWith("pg:")) continue
    const pgId = key.slice(3)
    if (desiredProductgroupIds.has(pgId)) continue
    await sync.deleteRecord(SF_FAVOURITE_OBJECT, sfId)
    deleted++
  }

  await updateCustomersWorkflow(container).run({
    input: {
      selector: { id: [customerId] },
      update: {
        metadata: {
          ...metadata,
          [WISHLIST_METADATA_KEY]: handles,
          [SF_FAVOURITES_HASH_METADATA_KEY]: fingerprint,
        },
      },
    },
  })

  return { skipped: false, created, deleted }
}
