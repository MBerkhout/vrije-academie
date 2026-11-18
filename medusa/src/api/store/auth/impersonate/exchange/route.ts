import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { exchangeImpersonationHandoff } from "../../../../../lib/customer-auth/impersonation"

/**
 * POST /store/auth/impersonate/exchange
 * Body: { code: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as { code?: string }
  const code = body.code?.trim()
  if (!code) {
    res.status(400).json({ message: "code is required" })
    return
  }

  try {
    const forwarded = req.headers["x-forwarded-for"]
    const clientIp =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
      req.socket?.remoteAddress

    const { token } = await exchangeImpersonationHandoff(req.scope, code, clientIp)
    res.json({ token })
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.UNAUTHORIZED) {
      res.status(401).json({ message: "Invalid or expired code" })
      return
    }
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      res.status(401).json({ message: "Invalid or expired code" })
      return
    }
    throw err
  }
}