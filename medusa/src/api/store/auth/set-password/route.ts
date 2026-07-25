import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import {
  customerHasMedusaPassword,
  customerHasPassword,
  ensurePasswordlessAuthIdentity,
  findAuthIdentityByEmail,
  verifyLegacyPasswordForEmail,
} from "../../../../lib/customer-auth/helpers"
import { CUSTOMER_OTP_MODULE } from "../../../../modules/customer-otp"
import type CustomerOtpModuleService from "../../../../modules/customer-otp/service"
import { LEGACY_PASSWORD_MODULE } from "../../../../modules/legacy-password"
import type LegacyPasswordModuleService from "../../../../modules/legacy-password/service"

/**
 * POST /store/auth/set-password
 * Body: { newPassword, oldPassword?, otpCode? }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = (req.body ?? {}) as {
    newPassword?: string
    oldPassword?: string
    otpCode?: string
  }

  const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
  if (newPassword.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" })
    return
  }

  const customerId = req.auth_context.actor_id
  const customerService = req.scope.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const customer = await customerService.retrieveCustomer(customerId, { select: ["email"] })
  const email = customer.email
  if (!email) {
    res.status(400).json({ message: "Customer email not found" })
    return
  }

  const hasPassword = await customerHasPassword(req.scope, email)
  const hasMedusaPassword = await customerHasMedusaPassword(req.scope, email)
  const auth = req.scope.resolve(Modules.AUTH) as {
    updateProvider: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; error?: string }>
    authenticate: (
      provider: string,
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; error?: string }>
  }

  try {
    if (hasPassword) {
      const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : ""
      if (!oldPassword) {
        res.status(400).json({ message: "Current password is required" })
        return
      }
      if (hasMedusaPassword) {
        const login = await auth.authenticate("emailpass", {
          body: { email, password: oldPassword },
          headers: req.headers,
        })
        if (!login.success) {
          res.status(401).json({ message: "Current password is incorrect" })
          return
        }
      } else {
        const legacyValid = await verifyLegacyPasswordForEmail(req.scope, email, oldPassword)
        if (!legacyValid) {
          res.status(401).json({ message: "Current password is incorrect" })
          return
        }
      }
    } else {
      const otpCode = typeof body.otpCode === "string" ? body.otpCode.trim() : ""
      if (!/^\d{6}$/.test(otpCode)) {
        res.status(400).json({ message: "Valid verification code is required" })
        return
      }
      const otp = req.scope.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
        typeof CustomerOtpModuleService
      >
      await otp.verifyChallenge(email, otpCode, "set_password")
      await ensurePasswordlessAuthIdentity(req.scope, email)
    }

    let authIdentity = await findAuthIdentityByEmail(req.scope, email)
    if (!authIdentity) {
      authIdentity = await ensurePasswordlessAuthIdentity(req.scope, email)
    }

    const updated = await auth.updateProvider("emailpass", {
      entity_id: email,
      password: newPassword,
    })
    if (!updated.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        updated.error ?? "Could not update password"
      )
    }

    if (!hasMedusaPassword) {
      const legacyPassword = req.scope.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
        typeof LegacyPasswordModuleService
      >
      await legacyPassword.deleteByCustomerId(customerId)
    }

    res.json({ success: true })
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
    res.status(400).json({ message: "Could not update password" })
  }
}
