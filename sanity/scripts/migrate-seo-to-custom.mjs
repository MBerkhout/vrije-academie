/**
 * One-off: migrate sanity-plugin-seo fields to the custom `seo` object.
 *   - Keeps metaTitle, metaDescription, metaImage
 *   - Sets noIndex when nofollowAttributes or robotsMeta contains noindex
 *   - Removes openGraph, robotsMeta, nofollowAttributes
 *
 * Usage (from repo root):
 *   SANITY_STUDIO_PROJECT_ID=xxx SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/migrate-seo-to-custom.mjs
 *
 * Dry run:
 *   DRY_RUN=1 node sanity/scripts/migrate-seo-to-custom.mjs
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
    seo.openGraph !== undefined ||
    seo.robotsMeta !== undefined ||
    seo.nofollowAttributes !== undefined ||
    seo.title !== undefined ||
    seo.description !== undefined ||
    seo.image !== undefined

  const robotsMeta = Array.isArray(seo.robotsMeta) ? seo.robotsMeta : []
  const hadNoIndex =
    seo.noIndex === true ||
    seo.nofollowAttributes === true ||
    robotsMeta.some((d) => String(d).toLowerCase() === "noindex")

  const next = {
    metaTitle: seo.metaTitle ?? seo.title,
    metaDescription: seo.metaDescription ?? seo.description,
    metaImage: seo.metaImage ?? seo.image,
    noIndex: hadNoIndex,
  }

  // Drop empty keys
  if (next.metaTitle === undefined) delete next.metaTitle
  if (next.metaDescription === undefined) delete next.metaDescription
  if (next.metaImage === undefined) delete next.metaImage
  if (!next.noIndex) delete next.noIndex

  const unchanged =
    !hasLegacy &&
    seo.noIndex === next.noIndex &&
    seo.metaTitle === next.metaTitle &&
    seo.metaDescription === next.metaDescription &&
    seo.metaImage === next.metaImage

  if (unchanged && Object.keys(seo).every((k) => k in next || k === "_type")) {
    return null
  }

  return next
}

const docs = await client.fetch(
  `*[_type in ["page", "category", "product"] && defined(seo)] { _id, _type, title, label, seo }`,
)

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
