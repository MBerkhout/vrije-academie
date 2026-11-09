import pg from "pg"

function normalizeCustomerEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Hard-delete emailpass auth rows for an email (including soft-deleted).
 * Required before re-creating a storefront auth identity: unique index on
 * (entity_id, provider) does not ignore deleted_at.
 */
export async function hardDeleteEmailpassIdentitiesForEmail(email: string): Promise<number> {
  const normalized = normalizeCustomerEmail(email)
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    const result = await client.query(
      `DELETE FROM auth_identity ai
       USING provider_identity pi
       WHERE pi.auth_identity_id = ai.id
         AND pi.provider = 'emailpass'
         AND lower(pi.entity_id) = lower($1)`,
      [normalized]
    )
    return result.rowCount ?? 0
  } finally {
    await client.end()
  }
}
