/**
 * One-off: `generalSettings.giftCard` -> Page `pageCadeaubon` with `giftCardBlock` in `blocks[]` (slug `cadeaubon`);
 * then remove `giftCard` from `generalSettings`.
 * Requires SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) with write access.
 *
 * Usage:
 *   cd sanity && npm run migrate:gift-card-to-page
 */

import { randomBytes } from "node:crypto"
import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const CADEAUBON_CMS_PAGE_ID = "pageCadeaubon"
const PATH_SEGMENT = "cadeaubon"
const GS_ID = "generalSettings"

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

if (!projectId || !token) {
  console.error(
    "Missing env: " +
      [!projectId && "SANITY_STUDIO_PROJECT_ID", !token && "SANITY_API_WRITE_TOKEN"].filter(Boolean).join(", ") +
      ". This script loads sanity/.env when present.",
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
  return `giftCardBlock_${randomBytes(8).toString("hex")}`
}

const gs = await client.fetch(`*[_id == $id][0]{ giftCard }`, { id: GS_ID })
const legacy = gs?.giftCard && typeof gs.giftCard === "object" ? gs.giftCard : null

const existing = await client.fetch(
  `*[_id == $id][0]{ _id, _type, title, slug, blocks, seo }`,
  { id: CADEAUBON_CMS_PAGE_ID },
)

const hasBlock = existing?.blocks?.some((b) => b?._type === "giftCardBlock")

if (hasBlock && !legacy) {
  console.log(`${CADEAUBON_CMS_PAGE_ID} already has a giftCardBlock; no legacy giftCard. Nothing to do.`)
  process.exit(0)
}

if (!hasBlock) {
  const pl = legacy
    ? { _type: "giftCardBlock", _key: blockKey(), ...stripType(legacy) }
    : {
        _type: "giftCardBlock",
        _key: blockKey(),
        pageTitle: "Digitale cadeaubon",
        amountOptions: [15, 25, 50, 75, 100, 150],
        minAmountEuro: 5,
        maxAmountEuro: 500,
        section1Title: "1. Kies een waarde",
        section2Title: "2. Gegevens voor de digitale cadeaubon",
        customAmountLabel: "Of vul zelf een waarde in",
        recipientNameLabel: "Naam ontvanger",
        recipientEmailLabel: "Emailadres ontvanger",
        messageLabel: "Bericht",
        senderNameLabel: "Je naam (optioneel)",
        orderButtonLabel: "BESTEL",
      }

  if (existing) {
    const nextBlocks = [pl, ...(existing.blocks || [])]
    await client.patch(CADEAUBON_CMS_PAGE_ID).set({ blocks: nextBlocks }).commit({ visibility: "async" })
    console.log(`Appended giftCardBlock to existing ${CADEAUBON_CMS_PAGE_ID}.`)
  } else {
    await client.createOrReplace({
      _id: CADEAUBON_CMS_PAGE_ID,
      _type: "page",
      title: "Cadeaubon",
      slug: { _type: "slug", current: PATH_SEGMENT },
      blocks: [pl],
    })
    console.log(`Created ${CADEAUBON_CMS_PAGE_ID} (slug /${PATH_SEGMENT}) with giftCardBlock.`)
  }
} else {
  console.log(`${CADEAUBON_CMS_PAGE_ID} already has a giftCardBlock; cleaning legacy on generalSettings if any.`)
}

if (legacy) {
  await client.patch(GS_ID).unset(["giftCard"]).commit({ visibility: "async" })
  console.log("Removed generalSettings.giftCard.")
}

function stripType(obj) {
  const o = { ...obj }
  delete o._type
  return o
}
