import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import SalesforceSyncModuleService from "../../../../modules/salesforce-sync/service"
import { computeWebhookQueueStats } from "../../../../modules/salesforce-sync/utils/webhook-queue-stats"

function parseStatusFilter(raw: unknown): string[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

/** GET /admin/salesforce/webhook-queue */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const statusFilter = parseStatusFilter(req.query.status)

  const allForStats = await sync.listSalesforceWebhookEvents({}, { take: 5000 })
  const stats = await computeWebhookQueueStats(sync)

  const filtered = statusFilter?.length
    ? allForStats.filter((row) => statusFilter.includes(row.status ?? ""))
    : allForStats

  const events = filtered
    .sort((a, b) => {
      const aTime = new Date(a.received_at ?? a.created_at ?? 0).getTime()
      const bTime = new Date(b.received_at ?? b.created_at ?? 0).getTime()
      return bTime - aTime
    })
    .slice(offset, offset + limit)
    .map((row) => ({
      id: row.id,
      objectType: row.object_type,
      method: row.method,
      salesforceId: row.salesforce_id,
      entityType: row.entity_type,
      medusaId: row.medusa_id,
      status: row.status,
      attempts: row.attempts ?? 0,
      error: row.error,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
    }))

  res.json({
    stats,
    events,
    count: filtered.length,
    limit,
    offset,
  })
}
