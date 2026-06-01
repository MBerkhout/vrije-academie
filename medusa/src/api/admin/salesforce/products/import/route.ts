import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../lib/status"
import { pullProductFromSalesforceWorkflowId } from "../../../../../workflows/salesforce/pull-product-salesforce"
import { runSalesforceWorkflow } from "../../../../../workflows/salesforce/report-failure"

type ImportBody = {
  salesforce_id?: string
}

/** POST /admin/salesforce/products/import — pull Product2 from Salesforce into a new Medusa product. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const salesforceId = (req.body as ImportBody)?.salesforce_id?.trim()
  if (!salesforceId) {
    res.status(400).json({ message: "salesforce_id required" })
    return
  }

  const ret = await runSalesforceWorkflow(
    req.scope,
    pullProductFromSalesforceWorkflowId,
    { salesforceId },
    {
      eventGroupId: salesforceId,
      entityType: "product",
      medusaId: salesforceId,
    }
  )

  const result = ret.result as { medusaId?: string; created?: boolean } | undefined
  const medusaId = result?.medusaId
  if (!medusaId) {
    res.status(500).json({ message: "Import workflow did not return a Medusa product id" })
    return
  }

  res.json({
    success: true,
    created: result?.created === true,
    medusa_id: medusaId,
    ...(await salesforceStatusForEntity(req.scope, "product", medusaId)),
  })
}
