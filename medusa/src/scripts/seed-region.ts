import { IRegionModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"
import { randomBytes } from "crypto"

const MOLLIE_PROVIDER_IDS = [
  "pp_mollie-hosted-checkout_mollie",
  "pp_mollie-ideal_mollie",
  "pp_mollie-card_mollie",
  "pp_mollie-bancontact_mollie",
  "pp_mollie-giftcard_mollie",
  "pp_mollie-paypal_mollie",
  "pp_mollie-apple-pay_mollie",
]

function generateId(): string {
  return "01" + randomBytes(9).toString("hex").toUpperCase().slice(0, 16)
}

/**
 * Seed script: ensure a region exists with EUR currency and all Mollie
 * payment providers linked.
 *
 * Run with:  npm run seed:region
 *
 * Pass REGION_NAME env var to override the region name (default: "Default").
 * This script is idempotent.
 */
export default async function seedRegion({ container }: ExecArgs) {
  const regionService: IRegionModuleService = container.resolve(Modules.REGION)

  const regionName = process.env.REGION_NAME ?? "Default"
  const existing = await regionService.listRegions()
  let region = existing.find((r: any) => r.name === regionName) ?? existing[0]

  if (!region) {
    console.log(`Creating region "${regionName}"…`)
    const [created] = await regionService.createRegions([
      {
        name: regionName,
        currency_code: "eur",
        countries: ["nl"],
      },
    ])
    region = created
    console.log("✓ Region created:", region.id)
  } else {
    console.log("✓ Using existing region:", region.name, region.id)
  }

  // Link Mollie providers via raw query (Medusa does not expose this via the
  // region module service in v2 — must be done via Admin UI or directly)
  const pg = require("pg")
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL ?? "postgresql://medusa:medusa@localhost:5432/medusa",
  })
  await client.connect()

  for (const providerId of MOLLIE_PROVIDER_IDS) {
    await client.query(
      `INSERT INTO region_payment_provider (id, region_id, payment_provider_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [generateId(), region.id, providerId]
    )
  }

  const { rows } = await client.query(
    `SELECT payment_provider_id FROM region_payment_provider WHERE region_id = $1`,
    [region.id]
  )
  await client.end()

  console.log("✓ Mollie providers linked to region:")
  rows.forEach((r: any) => console.log("   •", r.payment_provider_id))
}
