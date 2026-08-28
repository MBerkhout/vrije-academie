import type { ExecArgs } from "@medusajs/framework/types"
import { IRegionModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"

import { EU_COUNTRIES, EU_COUNTRY_CODES } from "../lib/eu-countries"

const MOLLIE_PROVIDER_IDS = [
  "pp_mollie-hosted-checkout_mollie",
  "pp_mollie-ideal_mollie",
  "pp_mollie-card_mollie",
  "pp_mollie-bancontact_mollie",
  "pp_mollie-giftcard_mollie",
  "pp_mollie-paypal_mollie",
  "pp_mollie-apple-pay_mollie",
  "pp_mollie-klarna_mollie",
]

function generateId(): string {
  return "01" + randomBytes(9).toString("hex").toUpperCase().slice(0, 16)
}

/**
 * Seed script: ensure a region exists with EUR currency, all EU countries,
 * tax-inclusive pricing, per-country tax regions, and Mollie payment providers.
 *
 * Run with:  npm run seed:region
 *
 * Pass REGION_NAME env var to override the region name (default: "Default").
 * This script is idempotent.
 */
export default async function seedRegion({ container }: ExecArgs) {
  const regionService: IRegionModuleService = container.resolve(Modules.REGION)
  const taxModule = container.resolve(Modules.TAX) as {
    listTaxRegions: (filters?: { country_code?: string }) => Promise<{ id: string; country_code: string }[]>
    createTaxRegions: (data: unknown[]) => Promise<unknown[]>
    listTaxRates: (filters?: { tax_region_id?: string }) => Promise<{ id: string; tax_region_id: string; rate: number | null }[]>
    updateTaxRates: (id: string, data: { rate?: number }) => Promise<unknown>
  }
  const pricingModule = container.resolve(Modules.PRICING) as {
    listPricePreferences: (filters?: { attribute?: string; value?: string }) => Promise<{ id: string; is_tax_inclusive: boolean }[]>
    createPricePreferences: (data: { attribute: string; value: string; is_tax_inclusive: boolean }) => Promise<unknown>
    updatePricePreferences: (id: string, data: { is_tax_inclusive: boolean }) => Promise<unknown>
  }

  const regionName = process.env.REGION_NAME ?? "Default"
  const existing = await regionService.listRegions()
  let region = existing.find((r: { name?: string }) => r.name === regionName) ?? existing[0]

  if (!region) {
    console.log(`Creating region "${regionName}"…`)
    const [created] = await regionService.createRegions([
      {
        name: regionName,
        currency_code: "eur",
        countries: EU_COUNTRY_CODES,
        automatic_taxes: true,
      },
    ])
    region = created
    console.log("✓ Region created:", region.id)
  } else {
    console.log("✓ Using existing region:", region.name, region.id)
    await regionService.updateRegions(region.id, {
      countries: EU_COUNTRY_CODES,
      automatic_taxes: true,
    })
    console.log(`✓ Region updated with ${EU_COUNTRY_CODES.length} EU countries, automatic_taxes=true`)
  }

  const existingTaxRegions = await taxModule.listTaxRegions()
  const taxRegionByCountry = new Map(
    existingTaxRegions.map((tr) => [tr.country_code?.toLowerCase(), tr])
  )

  const toCreate = EU_COUNTRIES.filter((c) => !taxRegionByCountry.has(c.code)).map((c) => ({
    country_code: c.code,
    default_tax_rate: {
      name: `VAT ${c.labelEn}`,
      code: "vat",
      rate: c.vatRate,
    },
  }))

  if (toCreate.length) {
    await taxModule.createTaxRegions(toCreate)
    console.log(`✓ Created ${toCreate.length} tax region(s)`)
  } else {
    console.log("✓ All EU tax regions already exist")
  }

  const refreshedTaxRegions = await taxModule.listTaxRegions()
  for (const country of EU_COUNTRIES) {
    const taxRegion = refreshedTaxRegions.find((tr) => tr.country_code?.toLowerCase() === country.code)
    if (!taxRegion) continue
    const rates = await taxModule.listTaxRates({ tax_region_id: taxRegion.id })
    const defaultRate = rates[0]
    if (defaultRate && defaultRate.rate !== country.vatRate) {
      await taxModule.updateTaxRates(defaultRate.id, { rate: country.vatRate })
    }
  }
  console.log("✓ Tax rates synced to standard EU B2C VAT")

  const prefs = await pricingModule.listPricePreferences({
    attribute: "currency_code",
    value: "eur",
  })
  const eurPref = prefs[0]
  if (!eurPref) {
    await pricingModule.createPricePreferences({
      attribute: "currency_code",
      value: "eur",
      is_tax_inclusive: true,
    })
    console.log("✓ EUR price preference created (tax-inclusive)")
  } else if (!eurPref.is_tax_inclusive) {
    await pricingModule.updatePricePreferences(eurPref.id, { is_tax_inclusive: true })
    console.log("✓ EUR price preference updated to tax-inclusive")
  } else {
    console.log("✓ EUR price preference already tax-inclusive")
  }

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
  rows.forEach((r: { payment_provider_id: string }) => console.log("   •", r.payment_provider_id))
}
