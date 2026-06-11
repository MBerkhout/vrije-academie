import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  assertValidEmail,
  verifyOtpAndIssueToken,
} from "../../../../../lib/customer-auth/helpers"

/**
 * POST /store/auth/otp/verify
 * Body: { email, code, purpose?: 'login' | 'set_password' }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as {
    email?: string
    code?: string
    purpose?: "login" | "set_password"
  }

  try {
    const email = assertValidEmail(body.email ?? "")
    const code = typeof body.code === "string" ? body.code.trim() : ""
    if (!/^\d{6}$/.test(code)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Valid 6-digit code is required")
    }

    const purpose = body.purpose === "set_password" ? "set_password" : "login"
    const { token } = await verifyOtpAndIssueToken(req.scope, email, code, purpose)
    res.json({ token })
  } catch (err) {
    if (err instanceof MedusaError) {
      const status =
        err.type === MedusaError.Types.UNAUTHORIZED
          ? 401
          : err.type === MedusaError.Types.NOT_ALLOWED
            ? 429
            : 400
      res.status(status).json({ message: err.message })
      return
    }
    res.status(401).json({ message: "Invalid or expired verification code" })
  }
}
