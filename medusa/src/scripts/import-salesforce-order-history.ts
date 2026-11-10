import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { importCustomerOrderHistory } from "../modules/salesforce-sync/utils/import-salesforce-order-history"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

function parseArgs(argv: string[]): {
  email?: string
  customerId?: string
  all?: boolean
  dryRun?: boolean
  force?: boolean
  limit?: number
} {
  const out: ReturnType<typeof parseArgs> = {}
  for (const arg of argv) {
    if (arg === "--all") out.all = true
    else if (arg === "--dry-run") out.dryRun = true
    else if (arg === "--force") out.force = true
    else if (arg.startsWith("--email=")) out.email = arg.slice("--email=".length).trim()
    else if (arg.startsWith("--customer-id=")) out.customerId = arg.slice("--customer-id=".length).trim()
    else if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length))
      if (Number.isFinite(n)) out.limit = n
    }
  }
  return out
}

export default async function importSalesforceOrderHistoryScript({ container, args }: ExecArgs) {
  const flags = parseArgs(args ?? [])
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  if (!(await sync.isIntegrationReady())) {
    console.error("[salesforce:import-order-history] Salesforce integration is not configured")
    return
  }

  const customerModule = container.resolve(Modules.CUSTOMER)
  let customerIds: string[] = []

  if (flags.customerId) {
    customerIds = [flags.customerId]
  } else if (flags.email) {
    const [customer] = await customerModule.listCustomers({ email: flags.email }, { take: 1 })
    if (!customer?.id) {
      console.error(`No customer for email ${flags.email}`)
      return
    }
    customerIds = [customer.id]
  } else if (flags.all) {
    const customers = await customerModule.listCustomers({}, { take: flags.limit ?? 500 })
    customerIds = customers.map((c) => c.id)
  } else {
    console.log(
      "Usage: --email=user@example.com | --customer-id=cus_... | --all [--dry-run] [--force] [--limit=N]"
    )
    return
  }

  for (const customerId of customerIds) {
    const result = await importCustomerOrderHistory(container, customerId, {
      dryRun: flags.dryRun,
      force: flags.force,
    })
    console.log(`[salesforce:import-order-history] ${customerId}`, result)
  }
}
