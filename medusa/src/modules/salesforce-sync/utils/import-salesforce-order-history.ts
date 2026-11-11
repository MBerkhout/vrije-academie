import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  CUSTOMER_SF_ORDER_HISTORY_ERROR,
  CUSTOMER_SF_ORDER_HISTORY_IMPORTED,
  CUSTOMER_SF_ORDER_HISTORY_STARTED_AT,
  CUSTOMER_SF_ORDER_HISTORY_STATUS,
  CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT,
  CUSTOMER_SF_ORDER_HISTORY_TOTAL,
  isCustomerOrderHistoryRunningStale,
  parseCustomerOrderHistoryStatus,
  patchCustomerOrderHistoryMetadata,
} from "./customer-order-history-metadata"
import { withCustomerOrderHistoryLock } from "./customer-order-history-lock"
import {
  importSalesforceHistoryOrder,
  type SfHistoryOrderHeader,
} from "./import-salesforce-history-order"
import { SF_ORDER_OBJECT } from "./salesforce-config"
import SalesforceSyncModuleService from "../service"
import { ensureSyncState } from "./upsert-record"

const PAGE_SIZE = 25

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

/** SOQL dateTime literals must be unquoted ISO 8601. */
function toSoqlDateTime(value: string): string {
  const d = new Date(value.trim())
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid delta date: ${value}`)
  return d.toISOString()
}

async function resolveCustomerSalesforceAccountId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  customerId: string,
  email: string
): Promise<string | null> {
  const row = await sync.getStateByMedusaId("customer", customerId)
  const fromState = row?.salesforce_account_id?.trim()
  if (fromState) return fromState

  let contactId = row?.salesforce_id?.trim() || null
  if (!contactId) {
    contactId = await sync.findContactIdByEmail(email.trim().toLowerCase())
  }
  if (!contactId) return null

  const contact = await sync.retrieve("Contact", contactId, ["AccountId"])
  const accountId = String(contact.AccountId ?? "").trim()
  if (!accountId) return null

  if (row) {
    await sync.updateSalesforceSyncStates({
      id: row.id,
      salesforce_account_id: accountId,
    })
  } else {
    await ensureSyncState(sync, "customer", customerId, contactId)
    const created = await sync.getStateByMedusaId("customer", customerId)
    if (created) {
      await sync.updateSalesforceSyncStates({
        id: created.id,
        salesforce_account_id: accountId,
      })
    }
  }

  return accountId
}

async function countActivatedOrders(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  deltaSince?: string | null
): Promise<number> {
  const sinceClause = deltaSince?.trim()
    ? ` AND SystemModstamp >= ${toSoqlDateTime(deltaSince)}`
    : ""
  const q = await sync.query<{ expr0?: number }>(
    `SELECT COUNT() FROM ${SF_ORDER_OBJECT} WHERE AccountId = '${escapeSoql(accountId)}' AND Status = 'Activated'${sinceClause}`
  )
  return q.totalSize ?? 0
}

async function fetchOrderPage(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  accountId: string,
  offset: number,
  deltaSince?: string | null
): Promise<SfHistoryOrderHeader[]> {
  const sinceClause = deltaSince?.trim()
    ? ` AND SystemModstamp >= ${toSoqlDateTime(deltaSince)}`
    : ""
  const soql = `SELECT Id, OrderNumber, AccountId, EffectiveDate, CreatedDate, TotalAmount, Status, SystemModstamp,
    BillingStreet, BillingCity, BillingPostalCode, BillingCountry,
    (SELECT Id, ProductName__c, UnitPrice, TotalPrice, Quantity, vaProduct__c, Registration__c,
      Registration__r.Status__c,
      vaProduct__r.Name, vaProduct__r.Start_date_time__c, vaProduct__r.Product_City__c,
      vaProduct__r.Account_Teacher__r.Name, vaProduct__r.ProductGroup__r.Name,
      Product2.Name
    FROM OrderItems)
    FROM ${SF_ORDER_OBJECT}
    WHERE AccountId = '${escapeSoql(accountId)}' AND Status = 'Activated'${sinceClause}
    ORDER BY EffectiveDate DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}`

  const result = await sync.query<SfHistoryOrderHeader>(soql)
  return result.records ?? []
}

async function extendCustomerIncomingLock(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  customerId: string
): Promise<void> {
  const until = new Date(Date.now() + 20 * 60 * 1000)
  let row = await sync.getStateByMedusaId("customer", customerId)
  if (!row) {
    await sync.createSalesforceSyncStates([
      {
        entity_type: "customer",
        medusa_id: customerId,
        incoming_lock_until: until,
        last_status: "retrying",
      },
    ])
    return
  }
  await sync.updateSalesforceSyncStates({
    id: row.id,
    incoming_lock_until: until,
  })
}

export type ImportCustomerOrderHistoryOptions = {
  force?: boolean
  dryRun?: boolean
}

export type ImportCustomerOrderHistoryResult = {
  imported: number
  skipped: number
  total: number
  status: "done" | "failed" | "dry_run"
}

export async function importCustomerOrderHistory(
  container: MedusaContainer,
  customerId: string,
  options?: ImportCustomerOrderHistoryOptions
): Promise<ImportCustomerOrderHistoryResult | null> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const customerModule = container.resolve(Modules.CUSTOMER)

  if (!(await sync.isIntegrationReady())) {
    logger.debug(`[sf-order-history] integration not ready — skip customer ${customerId}`)
    return null
  }

  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  })
  const email = customer.email?.trim()
  if (!email) return null

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const status = parseCustomerOrderHistoryStatus(metadata)
  const deltaSince = metadata[CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT] as string | undefined

  if (!options?.force) {
    if (status === "done" && deltaSince) {
      // Incremental only — handled in same run with delta filter
    } else if (status === "running" && !isCustomerOrderHistoryRunningStale(metadata)) {
      return null
    }
  }

  const run = await withCustomerOrderHistoryLock(customerId, async () => {
    const previousSuppress = process.env.SALESFORCE_SUPPRESS_PUSH
    process.env.SALESFORCE_SUPPRESS_PUSH = "1"
    try {
      const accountId = await resolveCustomerSalesforceAccountId(sync, customerId, email)
      if (!accountId) {
        await patchCustomerOrderHistoryMetadata(container, customerId, {
          [CUSTOMER_SF_ORDER_HISTORY_STATUS]: "done",
          [CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT]: new Date().toISOString(),
          [CUSTOMER_SF_ORDER_HISTORY_ERROR]: null,
        })
        return { imported: 0, skipped: 0, total: 0, status: "done" as const }
      }

      const useDelta = !options?.force && status === "done" && !!deltaSince
      const total = await countActivatedOrders(sync, accountId, useDelta ? deltaSince : null)

      if (options?.dryRun) {
        return { imported: 0, skipped: 0, total, status: "dry_run" as const }
      }

      await patchCustomerOrderHistoryMetadata(container, customerId, {
        [CUSTOMER_SF_ORDER_HISTORY_STATUS]: "running",
        [CUSTOMER_SF_ORDER_HISTORY_STARTED_AT]: new Date().toISOString(),
        [CUSTOMER_SF_ORDER_HISTORY_TOTAL]: total,
        [CUSTOMER_SF_ORDER_HISTORY_IMPORTED]: 0,
        [CUSTOMER_SF_ORDER_HISTORY_ERROR]: null,
      })

      let imported = 0
      let skipped = 0
      let offset = 0

      while (offset < total) {
        await extendCustomerIncomingLock(sync, customerId)
        const page = await fetchOrderPage(sync, accountId, offset, useDelta ? deltaSince : null)
        if (!page.length) break

        for (const order of page) {
          try {
            const result = await importSalesforceHistoryOrder(container, customerId, order.Id, {
              prefetched: order,
            })
            if (result.skipped) skipped += 1
            else imported += 1
          } catch (err) {
            logger.warn(
              `[sf-order-history] order ${order.Id} failed: ${err instanceof Error ? err.message : String(err)}`
            )
            skipped += 1
          }
        }

        offset += page.length
        await patchCustomerOrderHistoryMetadata(container, customerId, {
          [CUSTOMER_SF_ORDER_HISTORY_IMPORTED]: imported + skipped,
        })

        if (page.length < PAGE_SIZE) break
      }

      await patchCustomerOrderHistoryMetadata(container, customerId, {
        [CUSTOMER_SF_ORDER_HISTORY_STATUS]: "done",
        [CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT]: new Date().toISOString(),
        [CUSTOMER_SF_ORDER_HISTORY_IMPORTED]: imported + skipped,
        [CUSTOMER_SF_ORDER_HISTORY_TOTAL]: total,
        [CUSTOMER_SF_ORDER_HISTORY_ERROR]: null,
      })

      return { imported, skipped, total, status: "done" as const }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await patchCustomerOrderHistoryMetadata(container, customerId, {
        [CUSTOMER_SF_ORDER_HISTORY_STATUS]: "failed",
        [CUSTOMER_SF_ORDER_HISTORY_ERROR]: message,
      })
      return { imported: 0, skipped: 0, total: 0, status: "failed" as const }
    } finally {
      if (previousSuppress === undefined) delete process.env.SALESFORCE_SUPPRESS_PUSH
      else process.env.SALESFORCE_SUPPRESS_PUSH = previousSuppress
    }
  })

  return run
}
