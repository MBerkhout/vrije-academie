import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { lookupCustomerAuth } from "../../../../lib/customer-auth/helpers"

/**
 * GET /store/customer/exists?email=...
 *
 * Returns { exists: boolean, hasPassword?: boolean } — backward-compatible alias for lookup.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const email = req.query.email as string | undefined

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "Valid email query param is required" })
    return
  }

  try {
    const result = await lookupCustomerAuth(req.scope, email)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed"
    res.status(400).json({ message })
  }
}
