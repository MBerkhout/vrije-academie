/**
 * Uploads homepage category tile images from vrijeacademie.nl (Cloudinary) and wires:
 * - editorial `image` on mirrored `category` documents
 * - Home page `categoriesBlock` items (bibliotheek) + CTA URL
 *
 * Usage (from repo root):
 *   npm run seed:homepage-categories --prefix sanity
 *
 * Requires SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_DATASET, SANITY_API_WRITE_TOKEN
 * (loaded from sanity/.env when unset).
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
const CATEGORIES_BLOCK_KEY = "c52fdb5c18ab"
const CTA_URL = "/ons-aanbod"

/** Order and images match https://www.vrijeacademie.nl/ “Populaire vakgebieden”. */
const HOMEPAGE_CATEGORIES = [
  {
    slug: "kunstgeschiedenis",
    categoryId: "medusa-category-01KSZC48G5RKWK4JZ19HWEF2SJ",
    imageUrl:
      "https://res.cloudinary.com/hjyy3bihk/image/upload/v1/medialibrary/2025/03/Meisje_met_de_Parel_zjjs0r.jpg",
    filename: "kunstgeschiedenis.jpg",
  },
  {
    slug: "architectuur",
    categoryId: "medusa-category-01KSZHVB1JYNZ16D2PK2TQFMV0",
    imageUrl:
      "https://res.cloudinary.com/hrqeb7jnw/image/upload/v1503574445/it8tp3t6lildzyxukwht.jpg",
    filename: "architectuur.jpg",
  },
  {
    slug: "filosofie",
    categoryId: "medusa-category-01KSZHVXSXZWF9RRXHJJPVM9GQ",
    imageUrl:
      "https://res.cloudinary.com/hrqeb7jnw/image/upload/v1503575367/zdmfhwxmp5ecgmgfdjda.jpg",
    filename: "filosofie.jpg",
  },
  {
    slug: "geschiedenis",
    categoryId: "medusa-category-01KSZHVBZTP5X1HDK6C1G3EADY",
    imageUrl:
      "https://res.cloudinary.com/hjyy3bihk/image/upload/v1/medialibrary/2025/03/Louis_XIV_of_France_qjuo5a.jpg",
    filename: "geschiedenis.jpg",
  },
  {
    slug: "wetenschap",
    categoryId: "medusa-category-01KSZHZ79PZ1Z8R5WD6HWWS39E",
    imageUrl:
      "https://res.cloudinary.com/hjyy3bihk/image/upload/v1/medialibrary/2022/02/Wetenschap_op_home_fahf4b.jpg",
    filename: "wetenschap.jpg",
  },
  {
    slug: "muziekgeschiedenis",
    categoryId: "medusa-category-01KSZJ3PVK51GW9FB4HDKN00P4",
    imageUrl:
      "https://res.cloudinary.com/hjyy3bihk/image/upload/v1/medialibrary/2025/03/Vivaldi_Fran%C3%A7ois_Morellon_de_La_Cave_1723_Museo_internazionale_e_biblioteca_della_musica_Bologna_v26jt7.jpg",
    filename: "muziekgeschiedenis.jpg",
  },
  {
    slug: "literatuur",
    categoryId: "medusa-category-01KSZHX1RZXRY3YMAAVCXWAYYB",
    imageUrl:
      "https://res.cloudinary.com/hrqeb7jnw/image/upload/v1503583474/hif5rfb495hv5gdbd6gt.jpg",
    filename: "literatuur.jpg",
  },
  {
    slug: "museaal",
    categoryId: "medusa-category-01KSZC48GRQ3GGJ5C2Z809YB0V",
    imageUrl:
      "https://res.cloudinary.com/hjyy3bihk/image/upload/v1/medialibrary/2025/03/20170303_123246_nt805l.jpg",
    filename: "museaal.jpg",
  },
]

function newKey() {
  return randomBytes(6).toString("hex")
}

function normalizeFetchUrl(url) {
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return url
  return `${url.replace(/\/$/, "")}.jpg`
}

async function uploadImageFromUrl(client, url, filename) {
  const fetchUrl = normalizeFetchUrl(url)
  const res = await fetch(fetchUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${fetchUrl}: ${res.status} ${res.statusText}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get("content-type") || "image/jpeg"
  const asset = await client.assets.upload("image", buffer, {
    filename,
    contentType,
  })
  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
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

const homepage = await client.fetch(
  `*[_id == $id][0]{ "itemKeys": blocks[_key == $blockKey][0].items[]._key }`,
  { id: HOMEPAGE_ID, blockKey: CATEGORIES_BLOCK_KEY },
)

if (!homepage?.itemKeys?.length) {
  console.error(`Home page ${HOMEPAGE_ID} has no categoriesBlock with key ${CATEGORIES_BLOCK_KEY}`)
  process.exit(1)
}

const itemKeys = homepage.itemKeys
while (itemKeys.length < 8) itemKeys.push(newKey())

console.log("Uploading category images and patching documents…")

for (const entry of HOMEPAGE_CATEGORIES) {
  console.log(`  ${entry.slug}…`)
  const image = await uploadImageFromUrl(client, entry.imageUrl, entry.filename)
  await client
    .patch(entry.categoryId)
    .set({ image })
    .commit({ visibility: "async" })
}

const items = HOMEPAGE_CATEGORIES.map((entry, index) => ({
  _key: itemKeys[index],
  source: "bibliotheek",
  category: { _type: "reference", _ref: entry.categoryId },
}))

await client
  .patch(HOMEPAGE_ID)
  .set({
    [`blocks[_key=="${CATEGORIES_BLOCK_KEY}"].items`]: items,
    [`blocks[_key=="${CATEGORIES_BLOCK_KEY}"].ctaUrl`]: CTA_URL,
  })
  .commit({ visibility: "async" })

console.log("Done. Published homepage and categories in Studio if you use drafts workflow.")
console.log(`  Home: ${HOMEPAGE_ID}`)
console.log(`  Categories block key: ${CATEGORIES_BLOCK_KEY}`)
console.log(`  CTA: ${CTA_URL}`)
