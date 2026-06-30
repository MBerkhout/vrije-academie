/**
 * Inspect a Salesforce Person Account / Contact by id or Medusa customer id.
 *   npx medusa exec ./src/scripts/inspect-sf-customer-link.ts -- --contact=003...
 *   npx medusa exec ./src/scripts/inspect-sf-customer-link.ts -- --customer=cus_...
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

export default async function inspectSfCustomerLink({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const contactId = arg("--contact")?.trim()
  const customerId = arg("--customer")?.trim()

  if (!contactId && !customerId) {
    logger.info("Usage: --contact=003... | --customer=cus_...")
    return
  }

  let sfContactId = contactId ?? ""
  if (customerId) {
    const row = await sync.getStateByMedusaId("customer", customerId)
    const cs = container.resolve(Modules.CUSTOMER)
    const [customer] = await cs.listCustomers({ id: customerId }, { take: 1 })
    logger.info(
      `Medusa ${customerId}: email=${customer?.email ?? "?"} name=${customer?.first_name} ${customer?.last_name}`
    )
    logger.info(
      `Sync state: contact=${row?.salesforce_id ?? "none"} account=${row?.salesforce_account_id ?? "none"} status=${row?.last_status ?? "none"} error=${row?.last_error ?? "none"}`
    )
    sfContactId = row?.salesforce_id ?? ""
  }

  if (!sfContactId) {
    logger.warn("No Salesforce Contact id to inspect")
    return
  }

  const contact = await sync.retrieve("Contact", sfContactId, [
    "Id",
    "Email",
    "FirstName",
    "LastName",
    "AccountId",
    "Phone",
    "MobilePhone",
    "MailingStreet",
    "MailingCity",
    "MailingPostalCode",
    "MailingCountry",
  ])
  logger.info(`Contact: ${JSON.stringify(contact, null, 2)}`)

  const accountId = String(contact.AccountId ?? "")
  if (accountId) {
    const account = await sync.retrieve("Account", accountId, [
      "Id",
      "Name",
      "PersonEmail",
      "PersonContactId",
      "RecordTypeId",
      "PersonMailingStreet",
      "PersonMailingCity",
      "PersonMailingPostalCode",
      "PersonMailingCountry",
      "BillingStreet",
      "BillingCity",
      "BillingPostalCode",
      "BillingCountry",
      "ShippingStreet",
      "ShippingCity",
      "ShippingPostalCode",
      "ShippingCountry",
      "Same_account_address__c",
      "Phone",
    ])
    logger.info(`Account: ${JSON.stringify(account, null, 2)}`)
  }
}
