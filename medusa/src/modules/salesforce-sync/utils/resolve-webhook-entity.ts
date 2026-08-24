import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { entityTypeFromSalesforceObject } from "../mappings/index"
import SalesforceSyncModuleService from "../service"
import {
  customerPersonAccountRecordTypeId,
  teacherAccountRecordTypeId,
} from "./webhook-queue-config"

export type ResolvedWebhookEntity = {
  entityType: string
  /** Salesforce id passed to pull workflows (Contact id for customers when known). */
  pullSalesforceId: string
  /** Person Account id when entity is customer resolved from Account webhook. */
  salesforceAccountId?: string | null
}

type AccountMeta = {
  Id: string
  RecordTypeId?: string
  PersonContactId?: string
}

const accountMetaCache = new Map<string, AccountMeta | null>()

async function loadAccountMetaBatch(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  accountIds: string[]
): Promise<void> {
  const missing = accountIds.filter((id) => !accountMetaCache.has(id))
  if (!missing.length) return

  const chunks: string[][] = []
  for (let i = 0; i < missing.length; i += 100) {
    chunks.push(missing.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    const inList = chunk.map((id) => `'${id.replace(/'/g, "\\'")}'`).join(",")
    try {
      const result = await sync.query<AccountMeta>(
        `SELECT Id, RecordTypeId, PersonContactId FROM Account WHERE Id IN (${inList})`
      )
      const found = new Set<string>()
      for (const row of result.records) {
        if (row?.Id) {
          accountMetaCache.set(row.Id, row)
          found.add(row.Id)
        }
      }
      for (const id of chunk) {
        if (!found.has(id)) accountMetaCache.set(id, null)
      }
    } catch {
      for (const id of chunk) accountMetaCache.set(id, null)
    }
  }
}

function resolveAccountEntityFromRecordType(recordTypeId: string | undefined): string {
  const teacherRt = teacherAccountRecordTypeId()
  const customerRt = customerPersonAccountRecordTypeId()
  if (teacherRt && recordTypeId === teacherRt) return "docent"
  if (customerRt && recordTypeId === customerRt) return "customer"
  return "customer"
}

export async function resolveWebhookEntity(
  container: MedusaContainer,
  objectType: string,
  salesforceId: string
): Promise<ResolvedWebhookEntity | null> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const trimmedObject = objectType.trim()
  const trimmedId = salesforceId.trim()

  let mapped = entityTypeFromSalesforceObject(trimmedObject)
  if (mapped === "account") {
    const docentState = await sync.getStateBySalesforceId("docent", trimmedId)
    if (docentState) {
      return { entityType: "docent", pullSalesforceId: trimmedId }
    }

    const customerState = await sync.getStateBySalesforceAccountId("customer", trimmedId)
    if (customerState?.salesforce_id) {
      return {
        entityType: "customer",
        pullSalesforceId: customerState.salesforce_id,
        salesforceAccountId: trimmedId,
      }
    }

    await loadAccountMetaBatch(sync, [trimmedId])
    const meta = accountMetaCache.get(trimmedId)
    const entityType = resolveAccountEntityFromRecordType(meta?.RecordTypeId)
    if (!teacherAccountRecordTypeId() && !customerPersonAccountRecordTypeId()) {
      logger.warn(
        `[salesforce-sync] webhook: Account ${trimmedId} unresolved by sync state; defaulting entity_type to ${entityType}`
      )
    } else if (
      entityType === "customer" &&
      meta?.RecordTypeId &&
      meta.RecordTypeId !== customerPersonAccountRecordTypeId() &&
      meta.RecordTypeId !== teacherAccountRecordTypeId()
    ) {
      logger.warn(
        `[salesforce-sync] webhook: Account ${trimmedId} RecordTypeId ${meta.RecordTypeId} unmatched; defaulting to customer`
      )
    }

    if (entityType === "docent") {
      return { entityType: "docent", pullSalesforceId: trimmedId }
    }

    const contactId = meta?.PersonContactId?.trim()
    if (!contactId) {
      return null
    }
    return {
      entityType: "customer",
      pullSalesforceId: contactId,
      salesforceAccountId: trimmedId,
    }
  }

  if (!mapped && trimmedObject === "Product2") {
    const rows = await sync.listStatesBySalesforceId(trimmedId)
    mapped = rows[0]?.entity_type ?? "product"
  }

  if (!mapped) return null
  return { entityType: mapped, pullSalesforceId: trimmedId }
}

/** Preload Account metadata for a batch of Account webhook rows. */
export async function preloadAccountMetadataForEvents(
  container: MedusaContainer,
  accountIds: string[]
): Promise<void> {
  if (!accountIds.length) return
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  await loadAccountMetaBatch(sync, accountIds)
}

export function clearAccountMetadataCache(): void {
  accountMetaCache.clear()
}
