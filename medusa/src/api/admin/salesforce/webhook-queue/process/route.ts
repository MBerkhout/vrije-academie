import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { triggerSalesforceWebhookQueueProcessing } from "../../../../../modules/salesforce-sync/process-webhook-events"

/** POST /admin/salesforce/webhook-queue/process — drain pending rows now. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  triggerSalesforceWebhookQueueProcessing(req.scope)
  res.status(202).json({ queued: true })
}
