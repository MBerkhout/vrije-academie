import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as crypto from "node:crypto"

import {
  entityTypeFromSalesforceObject,
  SF_COURSE_PRODUCT_OBJECT,
  SF_PRODUCTGROUP_OBJECT,
} from "../../../modules/salesforce-sync/mappings/index"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { findParentProductgroupIdsForLinkedOnlineSlave } from "../../../modules/salesforce-sync/utils/linked-online-productgroup"
import { runSalesforceWorkflow } from "../../../workflows/salesforce/report-failure"
import { pullWorkflowIdForEntity } from "../../../workflows/salesforce/registry"

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8")
    const bb = Buffer.from(b, "utf8")
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

type WebhookBody = {
  object_type?: string
  salesforce_id?: string
  /** When Salesforce sends Product2, disambiguate `product` vs `variant` using sync state row. */
  entity_type?: string
}

async function enqueueLinkedOnlineParentProductgroupPulls(
  scope: MedusaContainer,
  linkedOnlineSlaveGroupId: string
): Promise<string[]> {
  const sync = scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const pullId = pullWorkflowIdForEntity("productgroup")
  if (!pullId) return []

  const parentIds = await findParentProductgroupIdsForLinkedOnlineSlave(
    sync,
    linkedOnlineSlaveGroupId
  )
  for (const parentId of parentIds) {
    await runSalesforceWorkflow(
      scope,
      pullId,
      { salesforceId: parentId, manual: false },
      { eventGroupId: parentId, entityType: "productgroup", medusaId: parentId }
    )
  }
  return parentIds
}

async function resolveProductgroupSalesforceId(
  sync: InstanceType<typeof SalesforceSyncModuleService>,
  objectType: string,
  salesforceId: string
): Promise<string | null> {
  if (objectType === SF_PRODUCTGROUP_OBJECT) return salesforceId
  if (objectType !== SF_COURSE_PRODUCT_OBJECT) return null
  try {
    const row = await sync.retrieve(SF_COURSE_PRODUCT_OBJECT, salesforceId, ["Productgroup__c"])
    const parent = row.Productgroup__c
    return typeof parent === "string" && parent.trim() ? parent.trim() : null
  } catch {
    return null
  }
}

/** POST /hooks/salesforce */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const secret = process.env.SALESFORCE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    res.status(503).json({ message: "SALESFORCE_WEBHOOK_SECRET not configured" })
    return
  }
  const hdr = req.headers["x-salesforce-webhook-secret"]
  const sent = typeof hdr === "string" ? hdr : Array.isArray(hdr) ? hdr[0] : ""
  if (!timingSafeEqualString(sent, secret)) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = (req.body ?? {}) as WebhookBody
  const objectType = body.object_type?.trim()
  const salesforceId = body.salesforce_id?.trim()
  if (!objectType || !salesforceId) {
    res.status(400).json({ message: "object_type and salesforce_id required" })
    return
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>

  let entityType: string | null = body.entity_type?.trim() ?? null
  if (!entityType) {
    entityType = entityTypeFromSalesforceObject(objectType)
  }
  if (!entityType && objectType === "Product2") {
    const rows = await sync.listStatesBySalesforceId(salesforceId)
    entityType = rows[0]?.entity_type ?? null
  }

  // vaProduct__c webhooks re-import the parent product group (future-only guard inside workflow).
  if (entityType === "course_product") {
    const parentId = await resolveProductgroupSalesforceId(sync, objectType, salesforceId)
    if (!parentId) {
      res.status(400).json({ message: "Could not resolve parent product group for course product" })
      return
    }
    const pullId = pullWorkflowIdForEntity("productgroup")
    if (!pullId) {
      res.status(400).json({ message: "No pull workflow for productgroup" })
      return
    }
    await runSalesforceWorkflow(
      req.scope,
      pullId,
      { salesforceId: parentId, manual: false },
      { eventGroupId: parentId, entityType: "productgroup", medusaId: parentId }
    )
    const linkedParents = await enqueueLinkedOnlineParentProductgroupPulls(req.scope, parentId)
    res.status(202).json({
      queued: true,
      entity_type: "productgroup",
      salesforce_id: parentId,
      triggered_by: salesforceId,
      linked_online_parents_reimported: linkedParents,
    })
    return
  }

  if (entityType === "productgroup") {
    const pullId = pullWorkflowIdForEntity("productgroup")
    if (!pullId) {
      res.status(400).json({ message: "No pull workflow for productgroup" })
      return
    }
    await runSalesforceWorkflow(
      req.scope,
      pullId,
      { salesforceId, manual: false },
      { eventGroupId: salesforceId, entityType: "productgroup", medusaId: salesforceId }
    )
    const linkedParents = await enqueueLinkedOnlineParentProductgroupPulls(req.scope, salesforceId)
    res.status(202).json({
      queued: true,
      entity_type: "productgroup",
      salesforce_id: salesforceId,
      linked_online_parents_reimported: linkedParents,
    })
    return
  }

  if (!entityType) {
    res.status(400).json({ message: "Could not resolve entity_type for webhook" })
    return
  }

  const pullId = pullWorkflowIdForEntity(entityType)
  if (!pullId) {
    res.status(400).json({ message: `No pull workflow for ${entityType}` })
    return
  }

  const row =
    (await sync.getStateBySalesforceId(entityType, salesforceId)) ??
    (await sync.listStatesBySalesforceId(salesforceId))[0]

  if (!row?.medusa_id) {
    if (entityType === "product") {
      await runSalesforceWorkflow(
        req.scope,
        pullId,
        { salesforceId },
        {
          eventGroupId: salesforceId,
          entityType,
          medusaId: salesforceId,
        }
      )
      res.status(202).json({ queued: true, entity_type: entityType, import: true, salesforce_id: salesforceId })
      return
    }

    if (entityType === "customer") {
      await runSalesforceWorkflow(
        req.scope,
        pullId,
        { salesforceId },
        {
          eventGroupId: salesforceId,
          entityType,
          medusaId: salesforceId,
        }
      )
      res.status(202).json({
        queued: true,
        entity_type: entityType,
        import: true,
        salesforce_id: salesforceId,
      })
      return
    }

    logger.warn(`[salesforce-sync] webhook: no Medusa id for ${entityType} ${salesforceId}`)
    res.status(202).json({ queued: false, reason: "no_linked_medusa_row" })
    return
  }

  await sync.updateSalesforceSyncStates({
    id: row.id,
    last_status: "queued",
  })

  await runSalesforceWorkflow(
    req.scope,
    pullId,
    { medusaId: row.medusa_id, salesforceId },
    {
      eventGroupId: row.medusa_id,
      entityType,
      medusaId: row.medusa_id,
    }
  )

  res.status(202).json({ queued: true, entity_type: entityType, medusa_id: row.medusa_id })
}
