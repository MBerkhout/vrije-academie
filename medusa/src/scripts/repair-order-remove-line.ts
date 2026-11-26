import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import pg from "pg"

import { pushOrderToSalesforceWorkflowId } from "../workflows/salesforce/push-order-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

/**
 * Remove one order line (soft-delete) and adjust order_summary totals.
 * Optional: --push-salesforce to enqueue SF push after repair.
 */
export default async function repairOrderRemoveLine({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = arg("--order-id")?.trim()
  const lineItemId = arg("--line-item-id")?.trim()
  const pushSf = process.argv.includes("--push-salesforce")

  if (!orderId || !lineItemId) {
    logger.error("[repair-order-remove-line] Usage: --order-id= --line-item-id= [--push-salesforce]")
    return
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()

  try {
    await client.query("BEGIN")

    const link = await client.query(
      `SELECT oi.id as order_item_id, oi.quantity, oli.unit_price, oli.title
       FROM order_item oi
       JOIN order_line_item oli ON oli.id = oi.item_id AND oli.deleted_at IS NULL
       WHERE oi.order_id = $1 AND oi.item_id = $2 AND oi.deleted_at IS NULL`,
      [orderId, lineItemId]
    )
    const row = link.rows[0] as
      | { order_item_id: string; quantity: number; unit_price: number; title: string }
      | undefined
    if (!row) {
      throw new Error(`Line ${lineItemId} not found on order ${orderId}`)
    }

    const qty = Number(row.quantity) || 1
    const unitPrice = Number(row.unit_price) || 0
    const lineTotal = unitPrice * qty

    await client.query(
      `UPDATE order_line_item SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [lineItemId]
    )
    await client.query(
      `UPDATE order_item SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [row.order_item_id]
    )
    await client.query(
      `UPDATE customer_vathuis_access SET deleted_at = NOW(), updated_at = NOW()
       WHERE order_id = $1 AND order_line_item_id = $2 AND deleted_at IS NULL`,
      [orderId, lineItemId]
    )

    const sum = await client.query(
      `SELECT id, totals FROM order_summary WHERE order_id = $1 AND deleted_at IS NULL`,
      [orderId]
    )
    const summary = sum.rows[0] as { id: string; totals: Record<string, unknown> } | undefined
    if (summary?.totals) {
      const totals = { ...summary.totals }
      const bump = (key: string) => {
        if (typeof totals[key] === "number") totals[key] = Math.max(0, (totals[key] as number) - lineTotal)
      }
      bump("paid_total")
      bump("accounting_total")
      bump("transaction_total")
      bump("current_order_total")
      bump("original_order_total")
      for (const rk of [
        "raw_paid_total",
        "raw_accounting_total",
        "raw_transaction_total",
        "raw_current_order_total",
        "raw_original_order_total",
      ]) {
        const raw = totals[rk] as { value?: string; precision?: number } | undefined
        if (raw?.value != null) {
          const next = Math.max(0, Number(raw.value) - lineTotal)
          totals[rk] = { ...raw, value: String(next) }
        }
      }
      await client.query(`UPDATE order_summary SET totals = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(totals),
        summary.id,
      ])
    }

    await client.query("COMMIT")
    logger.info(`[repair-order-remove-line] removed "${row.title}" (−€${lineTotal}) from ${orderId}`)
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    await client.end()
  }

  if (pushSf) {
    await runSalesforceWorkflow(
      container,
      pushOrderToSalesforceWorkflowId,
      { orderId },
      { eventGroupId: orderId, entityType: "order", medusaId: orderId }
    )
    logger.info(`[repair-order-remove-line] enqueued Salesforce push for ${orderId}`)
  }
}