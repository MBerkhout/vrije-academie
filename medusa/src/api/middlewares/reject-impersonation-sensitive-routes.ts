import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  bearerTokenFromAuthorization,
  decodeCustomerJwtPayload,
  jwtHasImpersonationClaim,
} from "../../lib/customer-auth/impersonation-jwt"

function impersonationTokenFromRequest(req: MedusaRequest): boolean {
  const token = bearerTokenFromAuthorization(req.headers.authorization)
  if (!token) return false

  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string } }
  }
  const payload = decodeCustomerJwtPayload(token, config.projectConfig.http.jwtSecret)
  return jwtHasImpersonationClaim(payload)
}

/**
 * Blocks token refresh and credential changes while using an admin impersonation JWT.
 */
export function rejectImpersonationSensitiveRoutes(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  if (!impersonationTokenFromRequest(req)) {
    next()
    return
  }

  const path = req.path ?? ""
  if (path === "/auth/token/refresh" || path.endsWith("/auth/token/refresh")) {
    res.status(403).json({
      message: "Impersonation sessions cannot be refreshed",
    })
    return
  }

  if (path.includes("/store/auth/set-password")) {
    res.status(403).json({
      message: "Not allowed during impersonation",
    })
    return
  }

  if (path.includes("/store/auth/otp/request") && req.method === "POST") {
    const body = (req.body ?? {}) as { purpose?: string }
    if (body.purpose === "set_password") {
      res.status(403).json({
        message: "Not allowed during impersonation",
      })
      return
    }
  }

  next()
}

export function assertNotImpersonationSession(req: MedusaRequest): void {
  if (impersonationTokenFromRequest(req)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Not allowed during impersonation"
    )
  }
}