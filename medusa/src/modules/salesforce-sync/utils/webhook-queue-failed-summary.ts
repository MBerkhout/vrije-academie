export type WebhookFailedSummary = {
  topErrors: Array<{ message: string; count: number }>
  byObjectType: Record<string, number>
}

type FailedRow = {
  status?: string | null
  error?: string | null
  object_type?: string | null
}

const TOP_ERRORS_LIMIT = 8

/** Group terminal `failed` webhook rows for Sentry extras and ops scripts. */
export function summarizeTerminalFailedWebhookEvents(rows: FailedRow[]): WebhookFailedSummary {
  const byError = new Map<string, number>()
  const byObjectType: Record<string, number> = {}

  for (const row of rows) {
    if ((row.status ?? "") !== "failed") continue
    const objectType = row.object_type?.trim() || "unknown"
    byObjectType[objectType] = (byObjectType[objectType] ?? 0) + 1

    const raw = row.error?.trim()
    const message = raw ? raw.slice(0, 500) : "(no error message)"
    byError.set(message, (byError.get(message) ?? 0) + 1)
  }

  const topErrors = [...byError.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ERRORS_LIMIT)
    .map(([message, count]) => ({ message, count }))

  return { topErrors, byObjectType }
}