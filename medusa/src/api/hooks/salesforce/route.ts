import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as crypto from "node:crypto"

import {
  triggerSalesforceWebhookQueueProcessing,
} from "../../../modules/salesforce-sync/process-webhook-events"
import SalesforceSyncModuleService from "../../../modules/salesforce-sync/service"
import { isWebhookMethod } from "../../../modules/salesforce-sync/utils/webhook-queue-config"

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8")
    const bb = Buffer.from(b, "utf8")
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

type WebhookBody = {
  object_type?: string
  method?: string
  ids?: unknown
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") continue
    const trimmed = item.trim()
    if (trimmed) ids.push(trimmed)
  }
  return [...new Set(ids)]
}

/** POST /hooks/salesforce */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const secret = process.env.SALESFORCE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    res.status(503).json({ message: "SALESFORCE_WEBHOOK_SECRET not configured" })
    return
  }
  const hdr = req.headers["x-salesforce-webhook-secret"]
  const sent = typeof hdr === "string" ? hdr : Array.isArray(hdr) ? hdr[0] : ""
  if (!timingSafeEqualString(sent, secret)) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = (req.body ?? {}) as WebhookBody
  const objectType = body.object_type?.trim()
  const method = body.method?.trim().toLowerCase()
  const ids = normalizeIds(body.ids)

  if (!objectType || !method || !isWebhookMethod(method)) {
    res.status(400).json({ message: "object_type and method (create|update|delete) required" })
    return
  }
  if (!ids.length) {
    res.status(400).json({ message: "ids must be a non-empty array of Salesforce ids" })
    return
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = req.scope.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const receivedAt = new Date()

  const created = await sync.createSalesforceWebhookEvents(
    ids.map((salesforceId) => ({
      object_type: objectType,
      method,
      salesforce_id: salesforceId,
      status: "pending",
      attempts: 0,
      received_at: receivedAt,
    }))
  )

  const eventIds = created.map((row) => row.id)
  logger.info(
    `[salesforce-sync] webhook received object_type=${objectType} method=${method} count=${eventIds.length}`
  )

  triggerSalesforceWebhookQueueProcessing(req.scope)

  res.status(202).json({
    queued: true,
    count: eventIds.length,
    event_ids: eventIds,
  })
}
