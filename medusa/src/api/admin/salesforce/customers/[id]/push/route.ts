import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { salesforceStatusForEntity } from "../../../lib/status"
import { pushWorkflowIdForEntity } from "../../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../../workflows/salesforce/report-failure"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { id } = req.params
  const wf = pushWorkflowIdForEntity("customer")!
  const ret = await runSalesforceWorkflow(req.scope, wf, { customerId: id, isCreate: true }, {
    eventGroupId: id,
    entityType: "customer",
    medusaId: id,
  })
  const status = await salesforceStatusForEntity(req.scope, "customer", id)
  const failed =
    ret.hasFailed === true ||
    ret.acknowledgement?.hasFailed === true ||
    !!ret.thrownError ||
    (Array.isArray(ret.errors) && ret.errors.length > 0)
  const errorMessage =
    ret.thrownError?.message ||
    (ret.errors?.[0]?.error instanceof Error
      ? ret.errors[0].error.message
      : typeof ret.errors?.[0]?.error === "string"
        ? ret.errors[0].error
        : status.lastError)

  res.json({
    success: !failed && !!status.salesforceId,
    ...status,
    ...(failed || !status.salesforceId
      ? { message: errorMessage ?? "Push did not create a Salesforce link" }
      : {}),
  })
}
