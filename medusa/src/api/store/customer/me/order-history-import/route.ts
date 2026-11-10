import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { customerOrderHistoryImportPayload } from "../../../../../modules/salesforce-sync/utils/customer-order-history-metadata"
import { enqueueOrderHistoryImportFromSalesforce } from "../../../../../modules/salesforce-sync/utils/enqueue-order-history-import"

/** GET /store/customer/me/order-history-import — poll Salesforce order history import progress. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context.actor_id
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerService.retrieveCustomer(customerId, { select: ["metadata"] })
  const payload = customerOrderHistoryImportPayload(
    (customer.metadata ?? {}) as Record<string, unknown>
  )
  res.status(200).json(payload)
}

/** POST /store/customer/me/order-history-import — manually re-queue import (e.g. after failure). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context.actor_id
  await enqueueOrderHistoryImportFromSalesforce(req.scope, customerId)
  res.status(202).json({ queued: true })
}
