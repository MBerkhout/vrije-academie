import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../modules/salesforce-sync/service"
import { pullWorkflowIdForEntity, pushWorkflowIdForEntity } from "../../../../workflows/salesforce/registry"
import { runSalesforceWorkflow } from "../../../../workflows/salesforce/report-failure"
import { adminSalesforceInstanceBase, salesforceRecordViewUrl } from "../../../../utils/salesforce-url"
import { salesforceObjectForEntity } from "../../../../modules/salesforce-sync/mappings/index"

/** GET /admin/salesforce/failures */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
  const rawStatus = req.query.status
  const statusFilter =
    typeof rawStatus === "string" && rawStatus.length > 0 ? rawStatus.split(",") : ["error", "retrying"]

  const all = await sync.listSalesforceSyncStates(
    {},
    { take: 500, order: { created_at: "DESC" } }
  )
  const items = all
    .filter((r) => statusFilter.includes(r.last_status ?? ""))
    .slice(0, limit)
  const count = items.length

  const base = adminSalesforceInstanceBase()
  const mapped = items.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    medusaId: row.medusa_id,
    salesforceId: row.salesforce_id,
    lastStatus: row.last_status,
    lastError: row.last_error,
    failureCount: row.failure_count,
    lastPushedAt: row.last_pushed_at,
    openInSalesforceUrl:
      row.salesforce_id && base
        ? salesforceRecordViewUrl(
            base,
            salesforceObjectForEntity(row.entity_type as "customer" | "order" | "product" | "variant"),
            row.salesforce_id
          )
        : null,
  }))

  res.json({ items: mapped, count })
}
