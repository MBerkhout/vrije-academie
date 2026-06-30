/**
 * Migrates Page `pageVaThuis` from legacy `vathuisBlock` to VA Thuis page blocks.
 * Sets `isVaThuis: true` and slug `va-thuis`.
 *
 * Requires SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) with write access.
 *
 * Usage:
 *   cd sanity && npm run migrate:vathuis-landing-to-blocks
 */

import { randomBytes } from "node:crypto"
import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const VATHUIS_CMS_PAGE_ID = "pageVaThuis"
const VATHUIS_SLUG = "va-thuis"

/** Same four tiles as homepage “Populaire vakgebieden” (see seed-homepage-categories.mjs). */
const VATHUIS_LANDING_CATEGORIES = [
  { _ref: "medusa-category-01KSZC48G5RKWK4JZ19HWEF2SJ", slug: "kunstgeschiedenis" },
  { _ref: "medusa-category-01KSZHVB1JYNZ16D2PK2TQFMV0", slug: "architectuur" },
  { _ref: "medusa-category-01KSZHVXSXZWF9RRXHJJPVM9GQ", slug: "filosofie" },
  { _ref: "medusa-category-01KSZHVBZTP5X1HDK6C1G3EADY", slug: "geschiedenis" },
]

function defaultCategoryItems() {
  return VATHUIS_LANDING_CATEGORIES.map((entry) => ({
    _key: blockKey(`cat_${entry.slug}`),
    category: { _type: "reference", _ref: entry._ref },
  }))
}

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

function blockKey(prefix) {
  return `${prefix}_${randomBytes(8).toString("hex")}`
}

function textToPortableText(text) {
  const value = typeof text === "string" ? text.trim() : ""
  if (!value) return undefined
  return [
    {
      _type: "block",
      _key: blockKey("pt"),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: blockKey("span"), text: value, marks: [] }],
    },
  ]
}

function stripBlockType(obj) {
  if (!obj || typeof obj !== "object") return obj
  const copy = { ...obj }
  delete copy._type
  return copy
}

function blocksFromLegacy(legacy) {
  if (!legacy || typeof legacy !== "object") {
    return defaultLandingBlocks()
  }

  const blocks = []

  blocks.push({
    _type: "vathuisCategoriesBlock",
    _key: blockKey("vathuisCategoriesBlock"),
    maxItems: 4,
    items: defaultCategoryItems(),
  })

  blocks.push({
    _type: "vathuisHeroBlock",
    _key: blockKey("vathuisHeroBlock"),
    title: legacy.heroTitle ?? "De Vrije Academie bij jou thuis",
    intro: legacy.heroIntro ?? undefined,
    image: legacy.heroImage ?? undefined,
  })

  const usps = Array.isArray(legacy.usps) ? legacy.usps : []
  if (usps.length > 0) {
    blocks.push({
      _type: "uspBlock",
      _key: blockKey("uspBlock"),
      items: usps.map((usp) => ({
        _key: blockKey("uspItem"),
        source: "aangepast",
        title: usp?.title ?? "",
        description: textToPortableText(usp?.body),
      })),
      itemsLayout: "horizontal",
    })
  }

  blocks.push({
    _type: "vathuisProductRowBlock",
    _key: blockKey("vathuisProductRowBlock"),
    title: legacy.featuredTitle ?? "Nieuw binnen",
    sourceType: "automated",
    limit: 8,
    catalogCtaLabel: legacy.catalogCtaLabel ?? "Bekijk alle VA Thuis colleges",
  })

  blocks.push({
    _type: "vathuisTeachersBlock",
    _key: blockKey("vathuisTeachersBlock"),
    title: legacy.teachersTitle ?? "Populaire docenten",
    intro: legacy.teachersIntro ?? undefined,
  })

  const promoTiles = Array.isArray(legacy.promoTiles) ? legacy.promoTiles : []
  if (promoTiles.length > 0) {
    blocks.push({
      _type: "vathuisPromoTilesBlock",
      _key: blockKey("vathuisPromoTilesBlock"),
      tiles: promoTiles.map((tile) => ({
        _key: blockKey("promoTile"),
        title: tile?.title ?? "",
        description: tile?.description ?? undefined,
        href: tile?.href ?? undefined,
        image: tile?.image ?? undefined,
      })),
    })
  }

  return blocks
}

function defaultLandingBlocks() {
  return [
    {
      _type: "vathuisCategoriesBlock",
      _key: blockKey("vathuisCategoriesBlock"),
      maxItems: 4,
      items: defaultCategoryItems(),
    },
    {
      _type: "vathuisHeroBlock",
      _key: blockKey("vathuisHeroBlock"),
      title: "De Vrije Academie bij jou thuis",
      intro:
        "Ontdek on-demand colleges en series. Kijk wanneer het jou uitkomt — op je laptop, tablet of telefoon.",
    },
    {
      _type: "uspBlock",
      _key: blockKey("uspBlock"),
      items: [
        {
          _key: blockKey("uspItem"),
          source: "aangepast",
          title: "Elk moment",
          description: textToPortableText("Kijk wanneer het jou uitkomt."),
        },
        {
          _key: blockKey("uspItem"),
          source: "aangepast",
          title: "Overal",
          description: textToPortableText("Op je laptop, tablet of telefoon."),
        },
        {
          _key: blockKey("uspItem"),
          source: "aangepast",
          title: "Beschikbaar",
          description: textToPortableText("Na aankoop 3 maanden toegang."),
        },
      ],
      itemsLayout: "horizontal",
    },
    {
      _type: "vathuisProductRowBlock",
      _key: blockKey("vathuisProductRowBlock"),
      title: "Nieuw binnen",
      sourceType: "automated",
      limit: 8,
      catalogCtaLabel: "Bekijk alle VA Thuis colleges",
    },
    {
      _type: "vathuisTeachersBlock",
      _key: blockKey("vathuisTeachersBlock"),
      title: "Populaire docenten",
    },
  ]
}

const existing = await client.fetch(
  `*[_id == $id][0]{ _id, title, slug, blocks, seo, isVaThuis }`,
  { id: VATHUIS_CMS_PAGE_ID },
)

const legacyBlock = existing?.blocks?.find((b) => b?._type === "vathuisBlock")
const otherBlocks = (existing?.blocks ?? []).filter((b) => b?._type !== "vathuisBlock")
const alreadyMigrated =
  !legacyBlock &&
  (existing?.blocks ?? []).some((b) =>
    ["vathuisHeroBlock", "vathuisCategoriesBlock", "vathuisProductRowBlock"].includes(b?._type),
  )

if (alreadyMigrated && existing?.isVaThuis) {
  console.log(`${VATHUIS_CMS_PAGE_ID} already uses VA Thuis page blocks. Nothing to do.`)
  process.exit(0)
}

const migratedBlocks = legacyBlock
  ? blocksFromLegacy(stripBlockType(legacyBlock))
  : defaultLandingBlocks()

const nextBlocks = [...migratedBlocks, ...otherBlocks]

const pageDoc = {
  _id: VATHUIS_CMS_PAGE_ID,
  _type: "page",
  title: existing?.title ?? "VA Thuis",
  slug: { _type: "slug", current: VATHUIS_SLUG },
  isVaThuis: true,
  blocks: nextBlocks,
  ...(existing?.seo ? { seo: existing.seo } : {}),
}

if (existing) {
  await client.patch(VATHUIS_CMS_PAGE_ID).set(pageDoc).commit({ visibility: "async" })
  console.log(`Updated ${VATHUIS_CMS_PAGE_ID}: isVaThuis=true, slug=${VATHUIS_SLUG}, ${nextBlocks.length} blocks.`)
} else {
  await client.createOrReplace(pageDoc)
  console.log(`Created ${VATHUIS_CMS_PAGE_ID} (slug /${VATHUIS_SLUG}) with VA Thuis landing blocks.`)
}

if (legacyBlock) {
  console.log("Removed legacy vathuisBlock from blocks[].")
}
