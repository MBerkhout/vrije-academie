import { extractMolliePaymentId, isMolliePaymentFailed } from "./mollie-payment-status"

/** Mollie statuses that cannot be cancelled; Medusa may still drop the session. */
const MOLLIE_UNCANCELLABLE = new Set([
  "canceled",
  "cancelled",
  "expired",
  "failed",
  "paid",
])

export type MollieSafeDeleteLogger = {
  warn?: (message: string) => void
}

export type MollieSafeDeleteClient = {
  payments: {
    get: (id: string) => Promise<{ id?: string; status?: string }>
    cancel: (id: string) => Promise<unknown>
  }
}

function asData(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? { ...(data as Record<string, unknown>) } : {}
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Cancel a Mollie payment when possible. Never throws — Medusa's
 * `deletePaymentSessionsWorkflow` otherwise returns
 * `{ type: "unexpected_state", message: "Could not delete all payment sessions" }`
 * and checkout/cart updates stay blocked.
 */
export async function safeCancelMolliePayment(
  client: MollieSafeDeleteClient,
  data: unknown,
  logger?: MollieSafeDeleteLogger
): Promise<{ data: Record<string, unknown> }> {
  const fallback = asData(data)
  const id = extractMolliePaymentId(data)
  if (!id) {
    return { data: fallback }
  }

  let payment: { id?: string; status?: string }
  try {
    payment = await client.payments.get(id)
  } catch (error) {
    logger?.warn?.(`Could not load Mollie payment ${id} for cancel/delete: ${errorMessage(error)}`)
    return { data: fallback }
  }

  const status = (payment.status ?? "").toLowerCase()
  if (MOLLIE_UNCANCELLABLE.has(status) || isMolliePaymentFailed(status)) {
    return { data: { ...fallback, id: payment.id ?? id, status: payment.status } }
  }

  try {
    const cancelled = await client.payments.cancel(id)
    if (cancelled && typeof cancelled === "object") {
      return { data: cancelled as Record<string, unknown> }
    }
    return { data: { ...fallback, id, status: "canceled" } }
  } catch (error) {
    logger?.warn?.(`Could not cancel Mollie payment ${id}: ${errorMessage(error)}`)
    return { data: { ...fallback, id: payment.id ?? id, status: payment.status } }
  }
}

/**
 * Wrap a provider cancel/delete method so a throw cannot block Medusa
 * from removing the payment session row.
 */
export function wrapMollieDeleteNeverThrow<TInput extends { data?: unknown }, TOut>(
  original: (this: { logger_?: MollieSafeDeleteLogger }, input: TInput) => Promise<TOut>,
  label: string
): (this: { logger_?: MollieSafeDeleteLogger }, input: TInput) => Promise<TOut | { data: Record<string, unknown> }> {
  return async function wrappedMollieDelete(this, input) {
    try {
      return await original.call(this, input)
    } catch (error) {
      this.logger_?.warn?.(
        `Mollie ${label} ignored so Medusa can drop the payment session: ${errorMessage(error)}`
      )
      return { data: asData(input?.data) }
    }
  }
}
