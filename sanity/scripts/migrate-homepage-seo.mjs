/**
 * Set homepage SEO to match vrijeacademie.nl (title + meta description).
 *
 * Usage (from repo root):
 *   npm run migrate:homepage-seo --prefix sanity
 *
 * Dry run:
 *   DRY_RUN=1 npm run migrate:homepage-seo --prefix sanity
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"

const HOMEPAGE_ID = "27c7a0ae-010a-42e0-b7ed-9c40caa6571e"

const META_TITLE = "Home - Vrije Academie"
const META_DESCRIPTION =
  "De Vrije Academie is al sinds 1990 het grootste landelijke onderwijsinstituut voor kunst & cultuur en maakt culturele kennis voor een zo breed mogelijk publiek toegankelijk."

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

const homepage = await client.fetch(`*[_id == $id][0]{ _id, title, seo }`, { id: HOMEPAGE_ID })

if (!homepage) {
  console.error(`Home page ${HOMEPAGE_ID} not found`)
  process.exit(1)
}

const seo = {
  ...(homepage.seo && typeof homepage.seo === "object" ? homepage.seo : {}),
  metaTitle: META_TITLE,
  metaDescription: META_DESCRIPTION,
}

console.log(
  dryRun ? "[DRY RUN] Would patch homepage seo:" : "Patching homepage seo:",
  { metaTitle: seo.metaTitle, metaDescription: seo.metaDescription.slice(0, 60) + "…" },
)

if (!dryRun) {
  await client.patch(HOMEPAGE_ID).set({ seo }).commit()
  console.log("Done.")
}
