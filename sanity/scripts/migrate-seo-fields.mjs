/**
 * One-off: rename legacy SEO object fields to sanity-plugin-seo field names.
 *   seo.title       -> seo.metaTitle
 *   seo.description -> seo.metaDescription
 *   seo.image       -> seo.metaImage
 *
 * Affects `page` and `category` documents only. Product mirror fields are unchanged.
 *
 * Usage (from repo root):
 *   SANITY_STUDIO_PROJECT_ID=xxx SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/migrate-seo-fields.mjs
 *
 * Dry run:
 *   DRY_RUN=1 node sanity/scripts/migrate-seo-fields.mjs
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"

if (!projectId || !token) {
  console.error(
    "Missing env: " +
      [!projectId && "SANITY_STUDIO_PROJECT_ID", !token && "SANITY_API_WRITE_TOKEN"].filter(Boolean).join(", ") +
      ". This script loads sanity/.env when present, or set vars in the shell.",
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

function migrateSeoObject(seo) {
  if (!seo || typeof seo !== "object") return null

  const hasLegacy =
    seo.title !== undefined || seo.description !== undefined || seo.image !== undefined
  if (!hasLegacy) return null

  const next = { ...seo }

  if (seo.title !== undefined && next.metaTitle === undefined) {
    next.metaTitle = seo.title
    delete next.title
  }
  if (seo.description !== undefined && next.metaDescription === undefined) {
    next.metaDescription = seo.description
    delete next.description
  }
  if (seo.image !== undefined && next.metaImage === undefined) {
    next.metaImage = seo.image
    delete next.image
  }

  return next
}

const docs = await client.fetch(`*[_type in ["page", "category"] && defined(seo)] { _id, _type, title, label, seo }`)

let patched = 0
let skipped = 0

for (const doc of docs ?? []) {
  const nextSeo = migrateSeoObject(doc.seo)
  if (!nextSeo) {
    skipped++
    continue
  }

  const label = doc.title || doc.label || doc._id
  console.log(`${dryRun ? "[dry-run] " : ""}Patch ${doc._type} ${doc._id} (${label})`)

  if (!dryRun) {
    await client.patch(doc._id).set({ seo: nextSeo }).commit({ visibility: "async" })
  }
  patched++
}

console.log(`Done. Patched: ${patched}, skipped (already migrated or empty): ${skipped}.`)
