/**
 * One-off: copy legacy person.typeTags[0] -> personType, remove typeTags.
 * Requires SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) with write access.
 *
 * Usage (from repo root or sanity/):
 *   SANITY_STUDIO_PROJECT_ID=xxx SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/migrate-person-type.mjs
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const ALLOWED = new Set(["docent", "team", "gastspreker"])

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

const persons = await client.fetch(
  `*[_type == "person" && (defined(typeTags) || !defined(personType))]{ _id, typeTags, personType }`,
)

let patched = 0
for (const doc of persons) {
  let personType = doc.personType
  if (!personType && Array.isArray(doc.typeTags) && doc.typeTags.length > 0) {
    const first = doc.typeTags.find((t) => typeof t === "string" && ALLOWED.has(t))
    personType = first || doc.typeTags[0]
  }
  if (!personType || !ALLOWED.has(personType)) {
    console.warn(`Skip ${doc._id}: set personType manually (had typeTags=${JSON.stringify(doc.typeTags)})`)
    continue
  }
  if (doc.typeTags?.length > 1) {
    console.warn(`${doc._id}: had multiple typeTags, kept "${personType}"`)
  }
  await client.patch(doc._id).set({ personType }).unset(["typeTags"]).commit({ visibility: "async" })
  patched += 1
}

console.log(`Done. Patched ${patched} of ${persons.length} candidate documents.`)
