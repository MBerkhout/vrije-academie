import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../../lib/status"
import { pushWorkflowIdForEntity } from "../../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../../workflows/salesforce/report-failure"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { id } = req.params
  const wf = pushWorkflowIdForEntity("product")!
  await runSalesforceWorkflow(req.scope, wf, { productId: id }, {
    eventGroupId: id,
    entityType: "product",
    medusaId: id,
  })
  res.json({ success: true, ...(await salesforceStatusForEntity(req.scope, "product", id)) })
}
