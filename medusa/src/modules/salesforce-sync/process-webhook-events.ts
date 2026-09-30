import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { batchSyncProductsToSanity } from "../sanity-sync/batch-sync-products"
import { batchSyncRelatedEntitiesToSanity } from "../sanity-sync/batch-sync-related-entities"
import { courseProductParentGroupId } from "./mappings/course-product"
import {
  SF_COURSE_PRODUCT_OBJECT,
  SF_PRODUCTGROUP_OBJECT,
} from "./mappings/index"
import SalesforceSyncModuleService from "./service"
import {
  archiveEntityFromSalesforceDelete,
  isArchivableDeleteEntity,
  isDeleteSkippedEntity,
} from "./utils/archive-entity-from-salesforce-delete"
import { claimPendingWebhookEvents, type ClaimedWebhookEventRow } from "./utils/claim-webhook-events"
import { findParentProductgroupIdsForLinkedOnlineSlave } from "./utils/linked-online-productgroup"
import { runPool } from "./utils/run-pool"
import {
  clearAccountMetadataCache,
  preloadAccountMetadataForEvents,
  resolveWebhookEntity,
} from "./utils/resolve-webhook-entity"
import { withSanitySyncSuppressed } from "./utils/suppress-sanity-sync"
import {
  canPullWithoutLinkedMedusaRow,
  webhookQueueBatchSize,
  webhookQueueConcurrency,
  webhookQueueMaxAttempts,
  webhookQueueStaleProcessingMinutes,
} from "./utils/webhook-queue-config"
import { importRebookedOrderIfApplicable } from "./utils/import-rebooked-order"
import {
  extractWebhookApplyResult,
  webhookOutcomeFromApply,
} from "./utils/webhook-pull-result"
import { runSalesforceWorkflow, type RunResult } from "../../workflows/salesforce/report-failure"
import { pullWorkflowIdForEntity } from "../../workflows/salesforce/registry"

type ProcessOptions = {
  batchSize?: number
  concurrency?: number
}

type SanityCollectors = {
  productIds: Set<string>
  docentIds: Set<string>
  catalogCategoryIds: Set<string>
  nativeCategoryIds: Set<string>
}

type ProcessEventResult =
  | { outcome: "done"; medusaId?: string | null; entityType?: string | null }
  | { outcome: "skipped"; error: string; entityType?: string | null; medusaId?: string | null }
  | { outcome: "failed"; error: string; entityType?: string | null }

/** Per-batch pulls keyed by `entityType:salesforceId`; sibling session webhooks share one group pull. */
type PullCache = Map<string, Promise<ProcessEventResult>>

type ParentGroupResolution =
  | { parentId: string }
  | { parentId: null; error: string }

const PARENT_GROUP_UNRESOLVED_ERROR = "Could not resolve parent product group for course product"
const COURSE_PRODUCT_NOT_IN_SALESFORCE_ERROR = "course product no longer exists in Salesforce"

function extractMedusaIdFromRun(ret: RunResult): string | null {
  const result = ret.result as { medusaId?: string } | undefined
  if (result?.medusaId) return result.medusaId
  const nested = (ret.result as { result?: { medusaId?: string } } | undefined)?.result
  return nested?.medusaId ?? null
}

async function resolveProductgroupSalesforceIdFromVariantState(
  container: MedusaContainer,
  salesforceId: string
): Promise<string | null> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const variantState = await sync.getStateBySalesforceId("variant", salesforceId)
  if (!variantState?.medusa_id) return null

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id"],
      filters: { id: variantState.medusa_id },
    })
    const productId = (data?.[0] as { product_id?: string | null } | undefined)?.product_id?.trim()
    if (!productId) return null

    const groupState =
      (await sync.getStateByMedusaId("productgroup", productId)) ??
      (await sync.getStateByMedusaId("product", productId))
    const parentId = groupState?.salesforce_id?.trim()
    return parentId || null
  } catch {
    return null
  }
}

async function resolveProductgroupSalesforceId(
  container: MedusaContainer,
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  objectType: string,
  salesforceId: string
): Promise<ParentGroupResolution> {
  if (objectType === SF_PRODUCTGROUP_OBJECT) return { parentId: salesforceId }
  if (objectType !== SF_COURSE_PRODUCT_OBJECT) {
    return { parentId: null, error: PARENT_GROUP_UNRESOLVED_ERROR }
  }
  const fromState = await resolveProductgroupSalesforceIdFromVariantState(
    container,
    salesforceId
  )
  if (fromState) return { parentId: fromState }
  try {
    const row = await sync.retrieve(SF_COURSE_PRODUCT_OBJECT, salesforceId, ["ProductGroup__c"])
    const parentId = courseProductParentGroupId(row)
    return parentId ? { parentId } : { parentId: null, error: PARENT_GROUP_UNRESOLVED_ERROR }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      parentId: null,
      error: /NOT_FOUND|ENTITY_IS_DELETED/.test(message)
        ? COURSE_PRODUCT_NOT_IN_SALESFORCE_ERROR
        : `${PARENT_GROUP_UNRESOLVED_ERROR}: ${message}`,
    }
  }
}

async function enqueueLinkedOnlineParentProductgroupPulls(
  container: MedusaContainer,
  linkedOnlineSlaveGroupId: string,
  collectors: SanityCollectors
): Promise<void> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const pullId = pullWorkflowIdForEntity("productgroup")
  if (!pullId) return

  const parentIds = await findParentProductgroupIdsForLinkedOnlineSlave(
    sync,
    linkedOnlineSlaveGroupId
  )
  for (const parentId of parentIds) {
    const ret = await runSalesforceWorkflow(
      container,
      pullId,
      { salesforceId: parentId, manual: false },
      { eventGroupId: parentId, entityType: "productgroup", medusaId: parentId }
    )
    const medusaId = extractMedusaIdFromRun(ret)
    if (medusaId) collectors.productIds.add(medusaId)
  }
}

async function runPullForEntity(
  container: MedusaContainer,
  entityType: string,
  pullSalesforceId: string,
  medusaId: string | null,
  collectors: SanityCollectors
): Promise<ProcessEventResult> {
  const pullId = pullWorkflowIdForEntity(entityType)
  if (!pullId) {
    return {
      outcome: "skipped",
      entityType,
      error: `No pull workflow for ${entityType}`,
    }
  }

  const input: Record<string, unknown> = medusaId
    ? { medusaId, salesforceId: pullSalesforceId }
    : { salesforceId: pullSalesforceId }

  if (entityType === "productgroup") {
    input.manual = false
  }

  const metaMedusaId = medusaId ?? pullSalesforceId
  const ret = await runSalesforceWorkflow(container, pullId, input, {
    eventGroupId: metaMedusaId,
    entityType,
    medusaId: metaMedusaId,
  })

  const failed =
    ret.hasFailed === true ||
    ret.acknowledgement?.hasFailed === true ||
    !!ret.thrownError ||
    (Array.isArray(ret.errors) && ret.errors.length > 0)

  if (failed) {
    const err =
      ret.thrownError ||
      (ret.errors?.[0]?.error instanceof Error
        ? ret.errors[0].error
        : new Error(String(ret.errors?.[0]?.error ?? "Workflow failed")))
    return { outcome: "failed", entityType, error: err.message }
  }

  const apply = extractWebhookApplyResult(ret)
  const pullOutcome = webhookOutcomeFromApply(apply)
  const resolvedMedusaId = pullOutcome.medusaId ?? extractMedusaIdFromRun(ret) ?? medusaId

  if (pullOutcome.outcome === "skipped") {
    return {
      outcome: "skipped",
      entityType,
      error: pullOutcome.error ?? "skipped",
      medusaId: resolvedMedusaId,
    }
  }

  if (entityType === "product" || entityType === "productgroup") {
    if (resolvedMedusaId) collectors.productIds.add(resolvedMedusaId)
  }
  if (entityType === "docent" && resolvedMedusaId) {
    collectors.docentIds.add(resolvedMedusaId)
  }

  return { outcome: "done", entityType, medusaId: resolvedMedusaId }
}

async function processWebhookEventRow(
  container: MedusaContainer,
  row: ClaimedWebhookEventRow,
  collectors: SanityCollectors,
  pullCache: PullCache
): Promise<ProcessEventResult> {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const method = row.method.trim().toLowerCase()

  const resolved = await resolveWebhookEntity(container, row.object_type, row.salesforce_id)
  if (!resolved) {
    return {
      outcome: "skipped",
      error: `Could not resolve entity_type for ${row.object_type} ${row.salesforce_id}`,
    }
  }

  let { entityType, pullSalesforceId } = resolved

  if (entityType === "course_product") {
    const parent = await resolveProductgroupSalesforceId(
      container,
      sync,
      row.object_type,
      row.salesforce_id
    )
    if (parent.parentId === null) {
      return {
        outcome: "skipped",
        entityType: "course_product",
        error: parent.error,
      }
    }
    entityType = "productgroup"
    pullSalesforceId = parent.parentId
  }

  const unsupportedPullTypes = new Set(["order_item", "registration", "voucher", "variant"])
  if (unsupportedPullTypes.has(entityType)) {
    return {
      outcome: "skipped",
      entityType,
      error: `No pull workflow for ${entityType}`,
    }
  }

  const stateRow =
    (await sync.getStateBySalesforceId(entityType, pullSalesforceId)) ??
    (entityType === "customer" && resolved.salesforceAccountId
      ? await sync.getStateBySalesforceAccountId("customer", resolved.salesforceAccountId)
      : null) ??
    (await sync.listStatesBySalesforceId(pullSalesforceId))[0]

  const linkedMedusaId = stateRow?.medusa_id ?? null

  if (method === "delete") {
    if (isDeleteSkippedEntity(entityType)) {
      return {
        outcome: "skipped",
        entityType,
        error: `delete not actioned for ${entityType}`,
      }
    }
    if (!isArchivableDeleteEntity(entityType)) {
      return {
        outcome: "skipped",
        entityType,
        error: `delete not supported for ${entityType}`,
      }
    }
    if (!linkedMedusaId) {
      return {
        outcome: "skipped",
        entityType,
        error: "no_linked_medusa_row for delete",
      }
    }
    const archived = await archiveEntityFromSalesforceDelete(
      container,
      entityType,
      linkedMedusaId
    )
    for (const id of archived.productIds) collectors.productIds.add(id)
    for (const id of archived.docentIds) collectors.docentIds.add(id)
    return { outcome: "done", entityType, medusaId: linkedMedusaId }
  }

  if (entityType === "order" && !linkedMedusaId) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    try {
      const imported = await importRebookedOrderIfApplicable(container, pullSalesforceId)
      if (imported) {
        logger.info(
          `[salesforce-sync] imported omboeking order ${pullSalesforceId} → ${imported.medusaOrderId}`
        )
        return {
          outcome: "done",
          entityType,
          medusaId: imported.medusaOrderId,
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(
        `[salesforce-sync] omboeking import failed for ${pullSalesforceId}: ${msg}`
      )
      return {
        outcome: "failed",
        entityType,
        error: msg,
      }
    }
    return {
      outcome: "skipped",
      entityType,
      error: "no_linked_medusa_row",
    }
  }

  if (!linkedMedusaId && !canPullWithoutLinkedMedusaRow(entityType)) {
    return {
      outcome: "skipped",
      entityType,
      error: "no_linked_medusa_row",
    }
  }

  if (!linkedMedusaId && entityType === "productgroup") {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    logger.info(
      `[salesforce-sync] webhook ${method} ${entityType} ${pullSalesforceId} has no Medusa row; attempting auto-import`
    )
  }

  if (linkedMedusaId && stateRow) {
    await sync.updateSalesforceSyncStates({
      id: stateRow.id,
      last_status: "queued",
    })
  }

  const pullKey = `${entityType}:${pullSalesforceId}`
  let pull = pullCache.get(pullKey)
  if (!pull) {
    const pullEntityType = entityType
    const pullId = pullSalesforceId
    pull = (async () => {
      const pullResult = await runPullForEntity(
        container,
        pullEntityType,
        pullId,
        linkedMedusaId,
        collectors
      )
      if (pullResult.outcome === "done" && pullEntityType === "productgroup") {
        await enqueueLinkedOnlineParentProductgroupPulls(container, pullId, collectors)
      }
      return pullResult
    })()
    pullCache.set(pullKey, pull)
  }

  return pull
}

async function finalizeEventRow(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  row: ClaimedWebhookEventRow,
  result: ProcessEventResult,
  maxAttempts: number
): Promise<void> {
  const now = new Date()
  if (result.outcome === "done") {
    await sync.updateSalesforceWebhookEvents({
      id: row.id,
      status: "done",
      entity_type: result.entityType ?? row.entity_type,
      medusa_id: result.medusaId ?? row.medusa_id,
      error: null,
      processed_at: now,
    })
    return
  }

  if (result.outcome === "skipped") {
    await sync.updateSalesforceWebhookEvents({
      id: row.id,
      status: "skipped",
      entity_type: result.entityType ?? row.entity_type,
      medusa_id: result.medusaId ?? row.medusa_id,
      error: result.error,
      processed_at: now,
    })
    return
  }

  const nextAttempts = (row.attempts ?? 0) + 1
  await sync.updateSalesforceWebhookEvents({
    id: row.id,
    status: nextAttempts >= maxAttempts ? "failed" : "failed",
    entity_type: result.entityType ?? row.entity_type,
    attempts: nextAttempts,
    error: result.error,
    processed_at: now,
  })
}

export type ProcessWebhookEventsSummary = {
  claimed: number
  done: number
  skipped: number
  failed: number
}

export async function processPendingSalesforceWebhookEvents(
  container: MedusaContainer,
  options: ProcessOptions = {}
): Promise<ProcessWebhookEventsSummary> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const batchSize = options.batchSize ?? webhookQueueBatchSize()
  const concurrency = options.concurrency ?? webhookQueueConcurrency()
  const maxAttempts = webhookQueueMaxAttempts()

  if (!(await sync.isIntegrationReady())) {
    return { claimed: 0, done: 0, skipped: 0, failed: 0 }
  }

  clearAccountMetadataCache()
  const claimed = await claimPendingWebhookEvents(
    batchSize,
    maxAttempts,
    webhookQueueStaleProcessingMinutes()
  )
  if (!claimed.length) {
    return { claimed: 0, done: 0, skipped: 0, failed: 0 }
  }

  const accountIds = claimed
    .filter((row) => row.object_type.trim() === "Account")
    .map((row) => row.salesforce_id.trim())
  await preloadAccountMetadataForEvents(container, accountIds)

  const summary: ProcessWebhookEventsSummary = {
    claimed: claimed.length,
    done: 0,
    skipped: 0,
    failed: 0,
  }

  const collectors: SanityCollectors = {
    productIds: new Set(),
    docentIds: new Set(),
    catalogCategoryIds: new Set(),
    nativeCategoryIds: new Set(),
  }

  const pullCache: PullCache = new Map()

  await withSanitySyncSuppressed(async () => {
    await runPool(claimed, concurrency, async (row) => {
      let result: ProcessEventResult
      try {
        result = await processWebhookEventRow(container, row, collectors, pullCache)
      } catch (err) {
        result = {
          outcome: "failed",
          error: err instanceof Error ? err.message : String(err),
        }
      }

      if (result.outcome === "done") summary.done += 1
      else if (result.outcome === "skipped") summary.skipped += 1
      else summary.failed += 1

      await finalizeEventRow(sync, row, result, maxAttempts)
    })

    if (collectors.productIds.size) {
      await batchSyncProductsToSanity([...collectors.productIds], container)
    }
    if (
      collectors.docentIds.size ||
      collectors.catalogCategoryIds.size ||
      collectors.nativeCategoryIds.size
    ) {
      await batchSyncRelatedEntitiesToSanity(container, {
        catalogCategoryIds: [...collectors.catalogCategoryIds],
        nativeCategoryIds: [...collectors.nativeCategoryIds],
        docentIds: [...collectors.docentIds],
        onError: (entity, id, err) => {
          logger.warn(
            `[salesforce-sync] webhook batch sanity ${entity} ${id}: ${err.message}`
          )
        },
      })
    }
  })

  logger.info(
    `[salesforce-sync] webhook queue processed claimed=${summary.claimed} done=${summary.done} skipped=${summary.skipped} failed=${summary.failed}`
  )

  return summary
}

/** Fire-and-forget helper for HTTP handlers and admin retry. */
export function triggerSalesforceWebhookQueueProcessing(container: MedusaContainer): void {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  void processPendingSalesforceWebhookEvents(container).catch((err) => {
    logger.error(
      `[salesforce-sync] webhook queue processor error: ${err instanceof Error ? err.message : String(err)}`
    )
  })
}
