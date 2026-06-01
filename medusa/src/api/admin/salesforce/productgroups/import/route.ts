import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../lib/status"
import { pullProductgroupFromSalesforceWorkflowId } from "../../../../../workflows/salesforce/pull-productgroup-salesforce"
import { runSalesforceWorkflow } from "../../../../../workflows/salesforce/report-failure"

type ImportBody = {
  salesforce_id?: string
}

/** POST /admin/salesforce/productgroups/import — import vaProductgroup__c into Medusa. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const salesforceId = (req.body as ImportBody)?.salesforce_id?.trim()
  if (!salesforceId) {
    res.status(400).json({ message: "salesforce_id required" })
    return
  }

  const ret = await runSalesforceWorkflow(
    req.scope,
    pullProductgroupFromSalesforceWorkflowId,
    { salesforceId, manual: true },
    {
      eventGroupId: salesforceId,
      entityType: "productgroup",
      medusaId: salesforceId,
    }
  )

  const result = ret.result as
    | { medusaId?: string; created?: boolean; skipped?: boolean; skipReason?: string }
    | undefined

  if (result?.skipped) {
    res.status(409).json({
      success: false,
      skipped: true,
      reason: result.skipReason ?? "skipped",
    })
    return
  }

  const medusaId = result?.medusaId
  if (!medusaId) {
    res.status(500).json({ message: "Import workflow did not return a Medusa product id" })
    return
  }

  res.json({
    success: true,
    created: result?.created === true,
    medusa_id: medusaId,
    ...(await salesforceStatusForEntity(req.scope, "productgroup", medusaId)),
  })
}
