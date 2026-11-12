import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/** Defense in depth when authenticate middleware is misconfigured or session expired. */
export function requireCustomerActorId(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): string | null {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return null
  }
  return customerId
}
