/**
 * Replace homepage featuredTripBlock with productRowBlock entries.
 *
 * Usage (from repo root):
 *   npm run migrate:homepage-product-row --prefix sanity
 *
 * Requires SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_DATASET, SANITY_API_WRITE_TOKEN
 * (loaded from sanity/.env when unset).
 *
 * Handpicked block is created with the first 4 mirrored products returned by GROQ.
 * Adjust product refs in Studio if needed (e.g. travel picks + CTA "Bekijk al onze reizen").
 */

import { createClient } from "@sanity/client"
import { randomBytes } from "node:crypto"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

const HOMEPAGE_ID = "27c7a0ae-010a-42e0-b7ed-9c40caa6571e"

function newKey() {
  return randomBytes(6).toString("hex")
}

function layoutDefaults() {
  return {
    marginTop: "24",
    marginBottom: "24",
    width: "full",
    backgroundColor: "none",
  }
}

if (!projectId || !token) {
  console.error(
    "Missing SANITY_STUDIO_PROJECT_ID (or NEXT_PUBLIC_SANITY_PROJECT_ID) and SANITY_API_WRITE_TOKEN",
  )
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
})

const [homepage, sampleProducts] = await Promise.all([
  client.fetch(`*[_id == $id][0]{ blocks }`, { id: HOMEPAGE_ID }),
  client.fetch(
    `*[_type == "product" && defined(handle)] | order(_updatedAt desc) [0...4]{ _id }`,
  ),
])

if (!homepage) {
  console.error(`Home page ${HOMEPAGE_ID} not found`)
  process.exit(1)
}

const existingBlocks = Array.isArray(homepage.blocks) ? homepage.blocks : []
const withoutFeaturedTrip = existingBlocks.filter((b) => b?._type !== "featuredTripBlock")
const removedCount = existingBlocks.length - withoutFeaturedTrip.length

const handpickedProducts = sampleProducts.map((p) => ({
  _type: "reference",
  _ref: p._id,
  _key: newKey(),
}))

const newBlocks = [
  {
    _key: newKey(),
    _type: "productRowBlock",
    title: "Uitgelichte reizen",
    titleSize: "h2",
    sourceType: "handpicked",
    products: handpickedProducts,
    ctaEnabled: true,
    ctaLabel: "Bekijk al onze reizen",
    ctaUrl: "/ons-aanbod?product_type=reis",
    ...layoutDefaults(),
  },
  {
    _key: newKey(),
    _type: "productRowBlock",
    title: "Bestsellers",
    titleSize: "h2",
    sourceType: "automated",
    automatedFeed: "bestsellers",
    ctaEnabled: true,
    ctaLabel: "Bekijk ons volledige aanbod",
    ctaUrl: "/ons-aanbod",
    ...layoutDefaults(),
  },
  {
    _key: newKey(),
    _type: "productRowBlock",
    title: "Voor jou",
    titleSize: "h2",
    sourceType: "personalized",
    titleFavorites: "Jouw favorieten",
    titleRecent: "Recent bekeken",
    ...layoutDefaults(),
  },
]

const insertIndex = withoutFeaturedTrip.findIndex((b) => b?._type === "heroBlock")
const blocks =
  insertIndex >= 0
    ? [
        ...withoutFeaturedTrip.slice(0, insertIndex + 1),
        ...newBlocks,
        ...withoutFeaturedTrip.slice(insertIndex + 1),
      ]
    : [...newBlocks, ...withoutFeaturedTrip]

await client.patch(HOMEPAGE_ID).set({ blocks }).commit({ visibility: "async" })

console.log("Done.")
console.log(`  Removed ${removedCount} featuredTripBlock(s)`)
console.log(`  Added ${newBlocks.length} productRowBlock(s)`)
console.log(`  Handpicked uses ${handpickedProducts.length} product ref(s) — adjust in Studio if needed.`)
