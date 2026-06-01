/**
 * One-off: `plpPage` singleton -> Page `pageOnsAanbod` with a `plpBlock` in `blocks[]` (slug `ons-aanbod`).
 * Requires SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) with write access.
 *
 * Usage (from repo root):
 *   SANITY_STUDIO_PROJECT_ID=xxx SANITY_STUDIO_DATASET=production SANITY_API_WRITE_TOKEN=xxx node sanity/scripts/migrate-plp-to-page.mjs
 */

import { randomBytes } from "node:crypto"
import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const PLP_CMS_PAGE_ID = "pageOnsAanbod"
const PLP_PATH_SEGMENT = "ons-aanbod"

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

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

function blockKey() {
  return `plpBlock_${randomBytes(8).toString("hex")}`
}

const legacy = await client.fetch(`*[_id == "plpPage"][0]`)
const existing = await client.fetch(
  `*[_id == $id][0]{ _id, _type, title, slug, blocks, seo }`,
  { id: PLP_CMS_PAGE_ID },
)

if (existing?.blocks?.some((b) => b?._type === "plpBlock")) {
  console.log(`${PLP_CMS_PAGE_ID} already has a plpBlock. Nothing to do.`)
  process.exit(0)
}

const defaultTabs = [
  { _key: "aanbod", label: "Ons aanbod", href: `/${PLP_PATH_SEGMENT}` },
  { _key: "agenda", label: "Agenda", href: "/agenda" },
]

const plpPayload = {
  _type: "plpBlock",
  _key: blockKey(),
  banner: legacy?.banner,
  intro: legacy?.intro,
  tabs: Array.isArray(legacy?.tabs) && legacy.tabs.length > 0 ? legacy.tabs : defaultTabs,
}

if (existing) {
  const nextBlocks = [plpPayload, ...(existing.blocks || [])]
  const mergedSeo = { ...(typeof legacy?.seo === "object" && legacy.seo ? legacy.seo : {}), ...(typeof existing.seo === "object" && existing.seo ? existing.seo : {}) }
  await client
    .patch(PLP_CMS_PAGE_ID)
    .set({ blocks: nextBlocks, ...(Object.keys(mergedSeo).length > 0 ? { seo: mergedSeo } : {}) })
    .commit({ visibility: "async" })
  console.log(`Appended plpBlock to existing ${PLP_CMS_PAGE_ID}.`)
} else {
  const doc = {
    _id: PLP_CMS_PAGE_ID,
    _type: "page",
    title: "Ons aanbod",
    slug: { _type: "slug", current: PLP_PATH_SEGMENT },
    blocks: [plpPayload],
    ...(legacy?.seo && typeof legacy.seo === "object" ? { seo: legacy.seo } : {}),
  }
  await client.createOrReplace(doc)
  console.log(`Created ${PLP_CMS_PAGE_ID} with plpBlock (slug /${PLP_PATH_SEGMENT}).`)
}

if (legacy) {
  console.log("Legacy plpPage still exists. Remove it in Studio or run delete when ready.")
}
