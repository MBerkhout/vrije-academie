import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const CUSTOMER_SF_ORDER_HISTORY_STATUS = "sf_order_history_status"
export const CUSTOMER_SF_ORDER_HISTORY_IMPORTED = "sf_order_history_imported"
export const CUSTOMER_SF_ORDER_HISTORY_TOTAL = "sf_order_history_total"
export const CUSTOMER_SF_ORDER_HISTORY_STARTED_AT = "sf_order_history_started_at"
export const CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT = "sf_order_history_synced_at"
export const CUSTOMER_SF_ORDER_HISTORY_ERROR = "sf_order_history_error"

export type CustomerOrderHistoryStatus = "pending" | "running" | "done" | "failed"

const STALE_RUNNING_MS = 15 * 60 * 1000

export function parseCustomerOrderHistoryStatus(
  metadata: Record<string, unknown> | null | undefined
): CustomerOrderHistoryStatus | null {
  const raw = metadata?.[CUSTOMER_SF_ORDER_HISTORY_STATUS]
  if (raw === "pending" || raw === "running" || raw === "done" || raw === "failed") {
    return raw
  }
  return null
}

export function isCustomerOrderHistoryRunningStale(
  metadata: Record<string, unknown> | null | undefined,
  now = Date.now()
): boolean {
  const status = parseCustomerOrderHistoryStatus(metadata)
  if (status !== "running") return false
  const started = metadata?.[CUSTOMER_SF_ORDER_HISTORY_STARTED_AT]
  const startedMs =
    typeof started === "string" ? new Date(started).getTime() : Number.NaN
  if (!Number.isFinite(startedMs)) return true
  return now - startedMs > STALE_RUNNING_MS
}

export function customerOrderHistoryImportPayload(
  metadata: Record<string, unknown> | null | undefined
): {
  status: CustomerOrderHistoryStatus | "idle"
  imported: number
  total: number | null
  error: string | null
  startedAt: string | null
  syncedAt: string | null
} {
  const status = parseCustomerOrderHistoryStatus(metadata) ?? "idle"
  const importedRaw = metadata?.[CUSTOMER_SF_ORDER_HISTORY_IMPORTED]
  const totalRaw = metadata?.[CUSTOMER_SF_ORDER_HISTORY_TOTAL]
  const errorRaw = metadata?.[CUSTOMER_SF_ORDER_HISTORY_ERROR]
  return {
    status,
    imported: typeof importedRaw === "number" ? importedRaw : Number(importedRaw ?? 0) || 0,
    total: typeof totalRaw === "number" ? totalRaw : totalRaw == null ? null : Number(totalRaw) || null,
    error: typeof errorRaw === "string" && errorRaw.trim() ? errorRaw.trim() : null,
    startedAt:
      typeof metadata?.[CUSTOMER_SF_ORDER_HISTORY_STARTED_AT] === "string"
        ? (metadata[CUSTOMER_SF_ORDER_HISTORY_STARTED_AT] as string)
        : null,
    syncedAt:
      typeof metadata?.[CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT] === "string"
        ? (metadata[CUSTOMER_SF_ORDER_HISTORY_SYNCED_AT] as string)
        : null,
  }
}

export async function patchCustomerOrderHistoryMetadata(
  container: MedusaContainer,
  customerId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, { select: ["id", "metadata"] })
  const metadata = {
    ...((customer.metadata ?? {}) as Record<string, unknown>),
    ...patch,
  }
  await customerModule.updateCustomers(customerId, { metadata })
}
