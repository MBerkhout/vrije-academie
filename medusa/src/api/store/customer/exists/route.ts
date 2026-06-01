import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

/**
 * GET /store/customer/exists?email=...
 *
 * Returns { exists: boolean } — whether a customer account exists for the given email.
 * No PII beyond the boolean is returned to prevent account enumeration attacks.
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

  const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)

  const [customers] = await customerService.listAndCountCustomers(
    { email: email.toLowerCase().trim() },
    { take: 1, select: ["id"] }
  )

  res.json({ exists: customers.length > 0 })
}
