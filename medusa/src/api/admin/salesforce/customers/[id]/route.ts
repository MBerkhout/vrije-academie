import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"
import { salesforceStatusForEntity } from "../../lib/status"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const { id } = req.params
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  res.json({
    configured: await sync.isIntegrationReady(),
    ...(await salesforceStatusForEntity(req.scope, "customer", id)),
  })
}
