import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../../lib/status"
import { pushWorkflowIdForEntity } from "../../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../../workflows/salesforce/report-failure"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { id } = req.params
  const wf = pushWorkflowIdForEntity("customer")!
  await runSalesforceWorkflow(req.scope, wf, { customerId: id }, {
    eventGroupId: id,
    entityType: "customer",
    medusaId: id,
  })
  res.json({ success: true, ...(await salesforceStatusForEntity(req.scope, "customer", id)) })
}
