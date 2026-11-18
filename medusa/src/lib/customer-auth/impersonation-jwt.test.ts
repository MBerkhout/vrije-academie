import jwt from "jsonwebtoken"
import { describe, expect, it } from "vitest"

import {
  IMPERSONATION_JWT_CLAIM,
  decodeCustomerJwtPayload,
  decodeJwtPayloadUnsafe,
  jwtHasImpersonationClaim,
} from "./impersonation-jwt"

const SECRET = "test-secret"

describe("impersonation JWT helpers", () => {
  it("detects impersonated_by in verified payload", () => {
    const token = jwt.sign(
      {
        actor_id: "cus_1",
        actor_type: "customer",
        app_metadata: {
          customer_id: "cus_1",
          [IMPERSONATION_JWT_CLAIM]: "user_admin",
        },
      },
      SECRET,
      { expiresIn: "1h" }
    )
    const payload = decodeCustomerJwtPayload(token, SECRET)
    expect(jwtHasImpersonationClaim(payload)).toBe(true)
    expect(payload?.app_metadata?.impersonated_by).toBe("user_admin")
  })

  it("decodes payload unsafely for banner checks", () => {
    const token = jwt.sign(
      {
        app_metadata: { [IMPERSONATION_JWT_CLAIM]: "user_x" },
      },
      SECRET
    )
    const unsafe = decodeJwtPayloadUnsafe(token)
    expect(unsafe?.app_metadata?.impersonated_by).toBe("user_x")
  })

  it("returns false when claim is missing", () => {
    const token = jwt.sign({ actor_id: "cus_1", app_metadata: { customer_id: "cus_1" } }, SECRET)
    const payload = decodeCustomerJwtPayload(token, SECRET)
    expect(jwtHasImpersonationClaim(payload)).toBe(false)
  })
})