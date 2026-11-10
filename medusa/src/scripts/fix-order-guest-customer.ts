import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import SalesforceSyncModuleService from "../modules/salesforce-sync/service"
import { pushCustomerToSalesforceWorkflowId } from "../workflows/salesforce/push-customer-salesforce"
import { runSalesforceWorkflow } from "../workflows/salesforce/report-failure"

/**
 * Re-link an order from a guest customer (has_account=false) to the registered account
 * with the same email, move the Salesforce Contact/Account link to that account and
 * push it (so the Contact gets the account's address).
 *
 * Dry run by default.
 *   npx medusa exec ./src/scripts/fix-order-guest-customer.ts <order_id> [apply]
 */
export default async function fixOrderGuestCustomer({ container, args }: ExecArgs) {
  const orderId = args.find((a) => a.startsWith("order_"))
  const apply = args.includes("--apply") || args.includes("apply")
  if (!orderId) throw new Error("Usage: ... <order_id> [apply]")

  const orderModule = container.resolve(Modules.ORDER)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  >

  const order = await orderModule.retrieveOrder(orderId, { select: ["id", "email", "customer_id"] })
  const email = order.email?.trim().toLowerCase()
  if (!email) throw new Error(`Order ${orderId} has no email`)

  const [account] = await customerModule.listCustomers(
    { email, has_account: true },
    { select: ["id"], take: 1 }
  )
  if (!account) throw new Error(`No registered account found for ${email}`)
  if (order.customer_id === account.id) {
    console.log(`Order already linked to ${account.id}, nothing to do`)
    return
  }

  const guestId = order.customer_id
  const guestState = guestId ? await sync.getStateByMedusaId("customer", guestId) : null
  const accountState = await sync.getStateByMedusaId("customer", account.id)

  console.log(`order ${orderId}: ${guestId} -> ${account.id}`)
  console.log(
    `SF link: guest=${guestState?.salesforce_id ?? "none"} account=${accountState?.salesforce_id ?? "none"}`
  )
  if (!apply) {
    console.log("Dry run. Re-run with the extra arg apply to make changes.")
    return
  }

  await orderModule.updateOrders([{ id: orderId, customer_id: account.id }])

  if (guestState?.salesforce_id && !accountState) {
    await sync.updateSalesforceSyncStates({ id: guestState.id, medusa_id: account.id })
    console.log(`Moved SF link ${guestState.salesforce_id} to ${account.id}`)
  }

  await runSalesforceWorkflow(
    container,
    pushCustomerToSalesforceWorkflowId,
    { customerId: account.id, isCreate: false },
    { eventGroupId: account.id, entityType: "customer", medusaId: account.id }
  )
  console.log("Customer push enqueued")
}
