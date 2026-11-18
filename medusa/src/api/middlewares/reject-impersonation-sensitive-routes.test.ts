import jwt from "jsonwebtoken"
import { describe, expect, it, vi } from "vitest"

import { IMPERSONATION_JWT_CLAIM } from "../../lib/customer-auth/impersonation-jwt"
import { rejectImpersonationSensitiveRoutes } from "./reject-impersonation-sensitive-routes"

const SECRET = "middleware-test-secret"

function mockReq(path: string, token?: string) {
  const next = vi.fn()
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }
  const req = {
    path,
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: {},
    scope: {
      resolve: () => ({
        projectConfig: { http: { jwtSecret: SECRET } },
      }),
    },
  }
  return { req, res, next }
}

describe("rejectImpersonationSensitiveRoutes", () => {
  it("blocks token refresh for impersonation JWT", () => {
    const token = jwt.sign(
      {
        app_metadata: { customer_id: "cus_1", [IMPERSONATION_JWT_CLAIM]: "user_1" },
      },
      SECRET
    )
    const { req, res, next } = mockReq("/auth/token/refresh", token)
    rejectImpersonationSensitiveRoutes(req as never, res as never, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it("allows refresh for normal customer JWT", () => {
    const token = jwt.sign({ app_metadata: { customer_id: "cus_1" } }, SECRET)
    const { req, res, next } = mockReq("/auth/token/refresh", token)
    rejectImpersonationSensitiveRoutes(req as never, res as never, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})