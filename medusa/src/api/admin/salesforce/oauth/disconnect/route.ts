import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../../modules/salesforce-sync/service"

/** POST /admin/salesforce/oauth/disconnect — clears DB-stored refresh token (not env). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  await sync.clearOAuthConnection()
  res.json({ success: true, ...(await sync.getOAuthStatusSummary()) })
}
