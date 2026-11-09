/**
 * Remove all storefront customers (and related auth / legacy rows). Keeps Medusa admin users.
 *
 *   npx medusa exec ./src/scripts/delete-all-storefront-customers.ts -- --dry-run
 *   npx medusa exec ./src/scripts/delete-all-storefront-customers.ts -- --confirm
 *   npx medusa exec ./src/scripts/delete-all-storefront-customers.ts -- --confirm --email=you@example.com
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { normalizeCustomerEmail } from "../lib/customer-auth/helpers"
import { hardDeleteEmailpassIdentitiesForEmail } from "../lib/customer-auth/purge-emailpass-identity"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"
import { CUSTOMER_OTP_MODULE } from "../modules/customer-otp"
import type CustomerOtpModuleService from "../modules/customer-otp/service"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

const LOG = "[delete-all-storefront-customers]"
const BATCH = 200

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type CustomerService = ICustomerModuleService & {
  softDeleteCustomers: (ids: string[]) => Promise<void>
}

export default async function deleteAllStorefrontCustomers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const dryRun = process.argv.includes("--dry-run")
  const confirm = process.argv.includes("--confirm")
  const emailOnly = arg("--email")?.trim()

  if (!dryRun && !confirm) {
    logger.error(`${LOG} Refusing to run without --dry-run or --confirm`)
    return
  }

  const customerService = container.resolve(Modules.CUSTOMER) as CustomerService
  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >
  const otp = container.resolve(CUSTOMER_OTP_MODULE) as InstanceType<
    typeof CustomerOtpModuleService
  >
  const sync = container.resolve("salesforceSync") as InstanceType<
    typeof SalesforceSyncModuleService
  > & {
    deleteSalesforceSyncStates: (id: string) => Promise<void>
  }
  const customerFilter = emailOnly ? { email: normalizeCustomerEmail(emailOnly) } : {}
  const ids: Array<{ id: string; email?: string | null }> = []
  let skip = 0
  for (;;) {
    const [batch] = await customerService.listAndCountCustomers(customerFilter, {
      take: 500,
      skip,
      select: ["id", "email"],
    })
    if (!batch.length) break
    ids.push(...batch)
    skip += batch.length
    if (emailOnly) break
  }

  logger.info(`${LOG} Found ${ids.length} customer(s)${dryRun ? " (dry-run)" : ""}`)

  let deleted = 0
  let authDeleted = 0
  let syncDeleted = 0

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    if (dryRun) {
      for (const customer of chunk) {
        logger.info(`${LOG} Would delete ${customer.id} ${customer.email ?? ""}`)
      }
      continue
    }

    for (const customer of chunk) {
      await legacyPassword.deleteByCustomerId(customer.id)

      if (customer.email) {
        const email = normalizeCustomerEmail(customer.email)
        const challenges = await otp.listCustomerOtpChallenges({ email }, { take: 20 })
        for (const ch of challenges) {
          await otp.deleteCustomerOtpChallenges(ch.id)
        }
      }

      const sfRow = await sync.getStateByMedusaId("customer", customer.id)
      if (sfRow?.id) {
        await sync.deleteSalesforceSyncStates(sfRow.id)
        syncDeleted++
      }

      if (customer.email) {
        authDeleted += await hardDeleteEmailpassIdentitiesForEmail(
          normalizeCustomerEmail(customer.email)
        )
      }
    }

    await customerService.softDeleteCustomers(chunk.map((c) => c.id))
    deleted += chunk.length
    logger.info(`${LOG} progress deleted=${deleted}/${ids.length}`)
  }

  logger.info(
    `${LOG} Done customers=${ids.length} deleted=${deleted} auth=${authDeleted} sf_state=${syncDeleted} dryRun=${dryRun}`
  )
}
