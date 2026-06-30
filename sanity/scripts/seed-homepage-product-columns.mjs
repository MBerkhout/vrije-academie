/**
 * Wires Home page columnsBlock product cards (VAthuis, Collegereeksen, Workshops)
 * to mirrored Sanity products and live-site CTA labels/URLs.
 *
 * Usage: npm run seed:homepage-product-columns --prefix sanity
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

const HOMEPAGE_ID = "27c7a0ae-010a-42e0-b7ed-9c40caa6571e"
const BLOCK_KEY = "4f1ff2b45b5b"

/** Column _key → content (matches vrijeacademie.nl homepage). */
const COLUMNS = {
  dc4cfa67ab26: {
    productCardsTitle: "VAthuis: on-demand video's",
    productCardsItemCtaLabel: "VAthuis – ON DEMAND",
    productCardsFooterCtaLabel: "Bekijk alle VAthuis colleges",
    productCardsFooterCtaUrl: "/va-thuis",
    products: [
      "medusa-product-prod_01KSZJ1DVQ649A1PARSNV17QVM", // Chagall
      "medusa-product-prod_01KSZJYHP4N1B988JH6QAJ2DR5", // Jan Steen
      "medusa-product-prod_01KSZM7FEF8R5ATE1MY030B33E", // Toetanchamon
    ],
  },
  "3138fa01cabf": {
    productCardsTitle: "Collegereeksen",
    productCardsItemCtaLabel: "Bekijk meer",
    productCardsFooterCtaLabel: "Bekijk in de zaal & online",
    productCardsFooterCtaUrl: "/ons-aanbod?record_type=collegereeks",
    products: [
      "medusa-product-prod_01KSZJ85TCDED1764WC53J919Y", // Architectuur in 40 gebouwen
      "medusa-product-prod_01KSZJX8N428N6FAHD1VD83EKQ", // Jaaropleiding Filosofie
      // Add Colleges Grenzeloze middeleeuwen when synced (handle colleges-grenzeloze-middeleeuwen)
    ],
  },
  "43bb8507791d": {
    productCardsTitle: "Workshops",
    productCardsItemCtaLabel: "Exclusief in Amsterdam",
    productCardsFooterCtaLabel: "Bekijk alle workshops",
    productCardsFooterCtaUrl: "/ons-aanbod/workshop",
    products: [
      "medusa-product-prod_01KSZMJ251VH3743R8QFBH0K2C", // Fotograferen smartphone
      "medusa-product-prod_01KSZMJP4428TJ6FMYJBC3S3SS", // Hockney
      "medusa-product-prod_01KSZMJE5H91J2JPDXWAPYY6GV", // Kintsugi
    ],
  },
}

function productRefs(ids) {
  return ids.map((id) => ({
    _type: "reference",
    _ref: id,
    _key: id.replace(/[^a-z0-9]/gi, "").slice(-12),
  }))
}

if (!projectId || !token) {
  console.error("Missing project id or SANITY_API_WRITE_TOKEN")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
})

const existing = await client.fetch(
  `*[_id == $id][0].blocks[_key == $blockKey][0].columns[]{ _key }`,
  { id: HOMEPAGE_ID, blockKey: BLOCK_KEY },
)

if (!existing?.length) {
  console.error("Homepage columns block not found")
  process.exit(1)
}

let patch = client.patch(HOMEPAGE_ID)

for (const { _key } of existing) {
  const cfg = COLUMNS[_key]
  if (!cfg) continue
  const base = `blocks[_key=="${BLOCK_KEY}"].columns[_key=="${_key}"]`
  patch = patch
    .set({
      [`${base}.productCardsTitle`]: cfg.productCardsTitle,
      [`${base}.productCardsItemCtaLabel`]: cfg.productCardsItemCtaLabel,
      [`${base}.productCardsFooterCtaEnabled`]: true,
      [`${base}.productCardsFooterCtaLabel`]: cfg.productCardsFooterCtaLabel,
      [`${base}.productCardsFooterCtaUrl`]: cfg.productCardsFooterCtaUrl,
      [`${base}.productCardsManualItems`]: productRefs(cfg.products),
    })
}

await patch.commit({ visibility: "async" })

console.log("Homepage product columns updated.")
console.log(
  "Collegereeksen column has 2 products until Colleges Grenzeloze middeleeuwen is synced to Sanity.",
)
