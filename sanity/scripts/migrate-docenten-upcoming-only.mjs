/**
 * Enable Persons block filter "onlyWithUpcomingActivities" on /over-ons/docenten.
 * Requires SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) with write access.
 *
 * Usage (from repo root or sanity/):
 *   SANITY_STUDIO_PROJECT_ID=xxx SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/migrate-docenten-upcoming-only.mjs
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const DOCENTEN_PAGE_ID = "7d869df8-533b-4f86-859a-874ddf8d668f"
const PERSONS_BLOCK_KEY = "docentenlijst01"

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

if (!projectId || !token) {
  console.error("Missing SANITY_STUDIO_PROJECT_ID (or NEXT_PUBLIC_SANITY_PROJECT_ID) and SANITY_API_WRITE_TOKEN")
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
})

const path = `blocks[_key=="72b526b1dfd2"].inPageNavContent[_key=="${PERSONS_BLOCK_KEY}"].dynamicFilters.onlyWithUpcomingActivities`

await client
  .patch(DOCENTEN_PAGE_ID)
  .set({ [path]: true })
  .commit({ visibility: "async" })

console.log(`Set ${path} = true on page ${DOCENTEN_PAGE_ID} (slug over-ons/docenten).`)
