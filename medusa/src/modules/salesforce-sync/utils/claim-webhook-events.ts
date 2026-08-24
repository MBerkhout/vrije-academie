import pg from "pg"

export type ClaimedWebhookEventRow = {
  id: string
  object_type: string
  method: string
  salesforce_id: string
  entity_type: string | null
  medusa_id: string | null
  status: string
  attempts: number
  error: string | null
  received_at: Date
  processed_at: Date | null
  created_at: Date
  updated_at: Date
}

/** Atomically claim pending (or retriable failed) webhook rows for processing. */
export async function claimPendingWebhookEvents(
  batchSize: number,
  maxAttempts: number
): Promise<ClaimedWebhookEventRow[]> {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL must be set to claim Salesforce webhook events")
  }

  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    const { rows } = await client.query<ClaimedWebhookEventRow>(
      `
      WITH cte AS (
        SELECT id
        FROM salesforce_webhook_event
        WHERE deleted_at IS NULL
          AND (
            status = 'pending'
            OR (status = 'failed' AND attempts < $2)
          )
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE salesforce_webhook_event e
      SET status = 'processing', updated_at = now()
      FROM cte
      WHERE e.id = cte.id
      RETURNING e.*;
      `,
      [batchSize, maxAttempts]
    )
    return rows
  } finally {
    await client.end()
  }
}
