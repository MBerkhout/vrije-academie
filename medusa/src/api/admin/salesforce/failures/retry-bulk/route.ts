import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import { pullWorkflowIdForEntity, pushWorkflowIdForEntity } from "../../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../../workflows/salesforce/report-failure"

type Body = { ids?: string[] }

/** POST /admin/salesforce/failures/retry-bulk */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { ids } = (req.body ?? {}) as Body
  if (!ids?.length) {
    res.status(400).json({ message: "ids required" })
    return
  }
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  for (const stateId of ids) {
    const row = await sync.retrieveSalesforceSyncState(stateId)
    if (!row) continue
    const entity = row.entity_type
    const medusaId = row.medusa_id
    const pullId = pullWorkflowIdForEntity(entity)
    const pushId = pushWorkflowIdForEntity(entity)
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
      if (!input) continue
      await runSalesforceWorkflow(req.scope, pushId, input, {
        eventGroupId: medusaId,
        entityType: entity,
        medusaId,
      })
    }
  }
  res.json({ success: true, retried: ids.length })
}
