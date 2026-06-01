import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../../lib/status"
import { pullWorkflowIdForEntity } from "../../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../../workflows/salesforce/report-failure"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { id } = req.params
  const status = await salesforceStatusForEntity(req.scope, "customer", id)
  if (!status.salesforceId) {
    res.status(400).json({ message: "No Salesforce id linked; push first" })
    return
  }
  const wf = pullWorkflowIdForEntity("customer")!
  await runSalesforceWorkflow(req.scope, wf, { medusaId: id, salesforceId: status.salesforceId }, {
    eventGroupId: id,
    entityType: "customer",
    medusaId: id,
  })
  res.json({ success: true, ...(await salesforceStatusForEntity(req.scope, "customer", id)) })
}
