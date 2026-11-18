import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { createImpersonationHandoff } from "../../../../../lib/customer-auth/impersonation"

/**
 * POST /admin/customer-auth/:id/impersonate
 *
 * Returns a one-time storefront handoff (60s, not emailed).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  if (!id?.trim()) {
    res.status(400).json({ message: "id is required" })
    return
  }

  const adminUserId = req.auth_context?.actor_id
  if (!adminUserId) {
    res.status(401).json({ message: "Admin authentication required" })
    return
  }

  try {
    const forwarded = req.headers["x-forwarded-for"]
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
      req.socket?.remoteAddress

    const result = await createImpersonationHandoff(req.scope, id, adminUserId, clientIp)
    res.json({
      code: result.code,
      url: result.url,
      expires_at: result.expires_at,
    })
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      res.status(404).json({ message: "Customer not found" })
      return
    }
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_ALLOWED) {
      res.status(429).json({ message: err.message })
      return
    }
    if (err instanceof MedusaError) {
      res.status(400).json({ message: err.message })
      return
    }
    throw err
  }
}