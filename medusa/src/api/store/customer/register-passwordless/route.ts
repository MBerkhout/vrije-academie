import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { registerPasswordlessCustomer } from "../../../../lib/customer-auth/helpers"

/**
 * POST /store/customer/register-passwordless
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as {
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
    birthdate?: string
    address?: {
      address_1?: string
      postal_code?: string
      city?: string
      country_code?: string
      phone?: string
    }
  }

  try {
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "First and last name are required")
    }
    if (!body.address?.address_1?.trim() || !body.address.postal_code?.trim() || !body.address.city?.trim()) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Complete address is required")
    }

    const { token } = await registerPasswordlessCustomer(req.scope, {
      email: body.email ?? "",
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      birthdate: body.birthdate,
      address: {
        address_1: body.address.address_1.trim(),
        postal_code: body.address.postal_code.trim(),
        city: body.address.city.trim(),
        country_code: (body.address.country_code ?? "nl").toLowerCase(),
        phone: body.address.phone,
      },
    })

    res.json({ token })
  } catch (err) {
    if (err instanceof MedusaError) {
      res.status(400).json({ message: err.message })
      return
    }
    res.status(500).json({ message: "Registration failed" })
  }
}
