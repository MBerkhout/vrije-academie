import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

import {
  getCustomerById,
  resetCustomerPassword,
} from "../../../../../lib/customer-auth/helpers"

const BodySchema = z.object({
  password: z.string().min(8).optional(),
})

/**
 * POST /admin/customer-auth/:id/reset-password
 *
 * Reset customer password. Generates a temporary password when body.password is omitted.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  if (!id?.trim()) {
    res.status(400).json({ message: "id is required" })
    return
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(req.body ?? {})
  } catch {
    res.status(400).json({ message: "Password must be at least 8 characters" })
    return
  }

  try {
    const customer = await getCustomerById(req.scope, id)
    if (!customer.email) {
      res.status(400).json({ message: "Customer email not found" })
      return
    }

    const result = await resetCustomerPassword(
      req.scope,
      customer.email,
      body.password
    )
    res.json({ password: result.password })
  } catch (err) {
    if (err instanceof MedusaError) {
      if (err.type === MedusaError.Types.NOT_FOUND) {
        res.status(404).json({ message: err.message })
        return
      }
      if (err.type === MedusaError.Types.INVALID_DATA) {
        res.status(400).json({ message: err.message })
        return
      }
    }
    throw err
  }
}
