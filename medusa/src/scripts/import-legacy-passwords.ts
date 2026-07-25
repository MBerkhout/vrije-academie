/**
 * Bulk-import Django PBKDF2 password hashes from a CSV export.
 *
 * CSV format: email,password_hash (header row optional)
 *
 *   npm run legacy:import-passwords -- --file=./data/legacy-passwords.csv
 *   npx medusa exec ./src/scripts/import-legacy-passwords.ts -- --dry-run --file=./data/legacy-passwords.csv
 */
import { readFileSync } from "fs"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"

import { customerHasMedusaPassword, normalizeCustomerEmail } from "../lib/customer-auth/helpers"
import { LEGACY_PASSWORD_MODULE } from "../modules/legacy-password"
import type LegacyPasswordModuleService from "../modules/legacy-password/service"

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`))
  return p?.split("=").slice(1).join("=")
}

type CsvRow = {
  email: string
  passwordHash: string
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const first = lines[0].toLowerCase()
  const hasHeader = first.includes("email") && first.includes("password")
  const dataLines = hasHeader ? lines.slice(1) : lines

  const rows: CsvRow[] = []
  for (const line of dataLines) {
    const commaIndex = line.indexOf(",")
    if (commaIndex <= 0) continue
    const email = line.slice(0, commaIndex).trim()
    const passwordHash = line.slice(commaIndex + 1).trim()
    if (!email || !passwordHash.startsWith("pbkdf2_sha256$")) continue
    rows.push({ email, passwordHash })
  }
  return rows
}

export default async function importLegacyPasswords({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const filePath = arg("--file")?.trim()
  const dryRun = process.argv.includes("--dry-run")

  if (!filePath) {
    logger.error(
      "[import-legacy-passwords] Usage: --file=path/to/export.csv [--dry-run]"
    )
    return
  }

  const content = readFileSync(filePath, "utf8")
  const rows = parseCsv(content)
  if (!rows.length) {
    logger.warn("[import-legacy-passwords] No valid rows found in CSV.")
    return
  }

  const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
  const legacyPassword = container.resolve(LEGACY_PASSWORD_MODULE) as InstanceType<
    typeof LegacyPasswordModuleService
  >

  let imported = 0
  let skipped = 0
  let notFound = 0

  for (const row of rows) {
    const email = normalizeCustomerEmail(row.email)
    const [customers] = await customerService.listAndCountCustomers(
      { email },
      { take: 1, select: ["id"] }
    )
    const customer = customers[0]
    if (!customer) {
      notFound++
      logger.warn(`[import-legacy-passwords] Customer not found: ${email}`)
      continue
    }

    if (await customerHasMedusaPassword(container, email)) {
      skipped++
      logger.info(`[import-legacy-passwords] Skip (Medusa password exists): ${email}`)
      continue
    }

    if (dryRun) {
      imported++
      logger.info(`[import-legacy-passwords] Would import: ${email}`)
      continue
    }

    await legacyPassword.set(customer.id, row.passwordHash)
    imported++
    logger.info(`[import-legacy-passwords] Imported: ${email}`)
  }

  logger.info(
    `[import-legacy-passwords] Done. imported=${imported} skipped=${skipped} notFound=${notFound} dryRun=${dryRun}`
  )
}
