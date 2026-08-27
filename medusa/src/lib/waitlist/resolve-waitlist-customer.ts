import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/core-flows"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { CUSTOMER_METADATA_KEYS } from "../../modules/salesforce-sync/mappings/customer"
import {
  assertValidEmail,
  ensurePasswordlessAuthIdentity,
  getCustomerByEmail,
  linkAuthIdentityToCustomer,
} from "../customer-auth/helpers"

export type WaitlistCustomerInput = {
  email: string
  first_name: string
  last_name: string
  phone: string
  authenticatedCustomerId?: string | null
}

function mergeNewsletterMetadata(
  existing: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    [CUSTOMER_METADATA_KEYS.newsletter]: true,
  }
}

async function updateCustomerProfile(
  customerService: ICustomerModuleService,
  customerId: string,
  input: WaitlistCustomerInput,
  existingMetadata: Record<string, unknown> | null | undefined
): Promise<void> {
  await customerService.updateCustomers(customerId, {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone.trim(),
    metadata: mergeNewsletterMetadata(existingMetadata),
  })
}

/**
 * Resolve Medusa customer for waitlist signup: logged-in user, existing email, or new guest.
 */
export async function resolveWaitlistCustomer(
  container: MedusaContainer,
  input: WaitlistCustomerInput
): Promise<{ customerId: string }> {
  const email = assertValidEmail(input.email)
  const firstName = input.first_name.trim()
  const lastName = input.last_name.trim()
  const phone = input.phone.trim()

  if (!firstName || !lastName) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "First and last name are required")
  }
  if (!phone) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Phone number is required")
  }
  if (!/^[+0-9\s\-()]{6,}$/.test(phone)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Valid phone number is required")
  }

  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService

  if (input.authenticatedCustomerId) {
    const customers = await customerService.listCustomers(
      { id: input.authenticatedCustomerId },
      { take: 1 }
    )
    const customer = customers[0]
    if (!customer) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
    }
    await updateCustomerProfile(
      customerService,
      customer.id,
      input,
      (customer.metadata ?? null) as Record<string, unknown> | null
    )
    return { customerId: customer.id }
  }

  const existing = await getCustomerByEmail(container, email)
  if (existing) {
    await updateCustomerProfile(
      customerService,
      existing.id,
      input,
      (existing.metadata ?? null) as Record<string, unknown> | null
    )
    return { customerId: existing.id }
  }

  const authIdentity = await ensurePasswordlessAuthIdentity(container, email)
  const workflow = createCustomerAccountWorkflow(container)
  const { result: customer } = await workflow.run({
    input: {
      authIdentityId: authIdentity.id,
      customerData: {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        metadata: mergeNewsletterMetadata(null),
      },
    },
  })

  if (!authIdentity.app_metadata?.customer_id) {
    await linkAuthIdentityToCustomer(container, authIdentity.id, customer.id)
  }

  return { customerId: customer.id }
}
