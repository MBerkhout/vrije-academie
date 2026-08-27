import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  customerHasPassword,
  getCustomerById,
} from "../../../../lib/customer-auth/helpers"

/**
 * GET /admin/customer-auth/:id
 *
 * Auth status for a customer (email + hasPassword).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  if (!id?.trim()) {
    res.status(400).json({ message: "id is required" })
    return
  }

  try {
    const customer = await getCustomerById(req.scope, id)
    if (!customer.email) {
      res.status(400).json({ message: "Customer email not found" })
      return
    }

    const hasPassword = await customerHasPassword(req.scope, customer.email)
    res.json({ email: customer.email, hasPassword })
  } catch (err) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      res.status(404).json({ message: "Customer not found" })
      return
    }
    throw err
  }
}
