import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../service"

export type CustomerSalesforceIds = {
  contactId: string
  accountId: string | null
}

/** Contact + Person Account ids from sync state or email lookup. */
export async function resolveCustomerSalesforceIds(
  container: MedusaContainer,
  customerId: string,
  email?: string | null
): Promise<CustomerSalesforceIds | null> {
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >
  if (!(await sync.isIntegrationReady())) return null

  const row = await sync.getStateByMedusaId("customer", customerId)
  let contactId = row?.salesforce_id?.trim() || null
  let accountId = row?.salesforce_account_id?.trim() || null

  if (!contactId && email) {
    contactId = (await sync.findContactIdByEmail(email.trim().toLowerCase())) ?? null
  }

  if (!contactId) return null

  if (!accountId) {
    try {
      const contact = await sync.retrieve("Contact", contactId, ["AccountId"])
      accountId = String(contact.AccountId ?? "").trim() || null
    } catch {
      accountId = null
    }
  }

  if (!email) {
    const customerService = container.resolve(Modules.CUSTOMER)
    const [customer] = await customerService.listCustomers({ id: customerId }, { take: 1 })
    email = customer?.email ?? null
  }

  if (!accountId && email) {
    const person = await sync.findPersonAccountByEmail(email.trim().toLowerCase())
    if (person) accountId = person.accountId
  }

  return { contactId, accountId }
}
