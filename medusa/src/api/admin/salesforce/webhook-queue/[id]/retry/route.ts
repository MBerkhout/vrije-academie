import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { triggerSalesforceWebhookQueueProcessing } from "../../../../../../modules/salesforce-sync/process-webhook-events"
import SalesforceSyncModuleService from "../../../../../../modules/salesforce-sync/service"

/** POST /admin/salesforce/webhook-queue/:id/retry */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const id = req.params.id
  const row = await sync.retrieveSalesforceWebhookEvent(id).catch(() => null)
  if (!row) {
    res.status(404).json({ message: "Webhook event not found" })
    return
  }

  await sync.updateSalesforceWebhookEvents({
    id: row.id,
    status: "pending",
    error: null,
    processed_at: null,
  })

  triggerSalesforceWebhookQueueProcessing(req.scope)
  res.status(202).json({ queued: true, id: row.id })
}
