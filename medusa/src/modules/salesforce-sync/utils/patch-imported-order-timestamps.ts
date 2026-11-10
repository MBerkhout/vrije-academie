import { Pool } from "pg"

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL?.trim()
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set")
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

/** Overwrite Medusa order.created_at after import (workflow sets "now"). */
export async function patchImportedOrderCreatedAt(
  orderId: string,
  createdAt: Date
): Promise<void> {
  const iso = createdAt.toISOString()
  const client = getPool()
  await client.query(
    `UPDATE "order" SET created_at = $1, updated_at = $1 WHERE id = $2`,
    [iso, orderId]
  )
}
