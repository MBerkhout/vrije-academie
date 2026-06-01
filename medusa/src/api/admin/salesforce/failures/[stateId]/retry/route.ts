import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../../modules/salesforce-sync/service"
import { pullWorkflowIdForEntity, pushWorkflowIdForEntity } from "../../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../../workflows/salesforce/report-failure"

/** POST /admin/salesforce/failures/:stateId/retry */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { stateId } = req.params
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const row = await sync.retrieveSalesforceSyncState(stateId)
  if (!row) {
    res.status(404).json({ message: "State not found" })
    return
  }

  const entity = row.entity_type
  const medusaId = row.medusa_id
  const pushId = pushWorkflowIdForEntity(entity)
  const pullId = pullWorkflowIdForEntity(entity)

  if (row.salesforce_id && pullId) {
    await runSalesforceWorkflow(req.scope, pullId, { medusaId, salesforceId: row.salesforce_id }, {
      eventGroupId: medusaId,
      entityType: entity,
      medusaId,
    })
  } else if (pushId) {
    const input =
      entity === "customer"
        ? { customerId: medusaId }
        : entity === "order"
          ? { orderId: medusaId }
          : entity === "product"
            ? { productId: medusaId }
            : entity === "variant"
              ? { variantId: medusaId }
              : null
    if (!input) {
      res.status(400).json({ message: "Unknown entity" })
      return
    }
    await runSalesforceWorkflow(req.scope, pushId, input, {
      eventGroupId: medusaId,
      entityType: entity,
      medusaId,
    })
  } else {
    res.status(400).json({ message: "Cannot retry this entity" })
    return
  }

  res.json({ success: true })
}
