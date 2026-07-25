import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  assertValidEmail,
  loginWithPasswordMigration,
} from "../../../../lib/customer-auth/helpers"

/**
 * POST /store/auth/login
 * Body: { email, password }
 *
 * Authenticates via Medusa scrypt or legacy Django PBKDF2 (migrates on success).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as { email?: string; password?: string }

  try {
    const email = assertValidEmail(body.email ?? "")
    const password = typeof body.password === "string" ? body.password : ""
    if (!password) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Password is required")
    }

    const { token } = await loginWithPasswordMigration(req.scope, email, password)
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
    res.status(401).json({ message: "Invalid email or password" })
  }
}
