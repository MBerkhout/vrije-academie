/**
 * Inline USP library references into page uspBlock items and remove source/usp fields.
 * Deletes orphaned `usp` library documents after successful migration.
 *
 * Usage (from repo root or sanity/):
 *   npm run migrate:usp-inline --prefix sanity
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

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

function blockKey(prefix = "uspItem") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

/** @param {Record<string, unknown>} libraryById */
function inlineUspItem(item, libraryById) {
  if (!item || typeof item !== "object") return item

  const next = { ...item }
  let changed = false

  if (next.source !== undefined) {
    delete next.source
    changed = true
  }

  const ref = next.usp?._ref ?? (typeof next.usp === "string" ? next.usp : null)
  const fromLibrary = ref && libraryById[ref]

  if (fromLibrary) {
    if (!next.title && fromLibrary.title) next.title = fromLibrary.title
    if (!next.description && fromLibrary.description) next.description = fromLibrary.description
    if (next.linkEnabled === undefined && fromLibrary.linkEnabled !== undefined) {
      next.linkEnabled = fromLibrary.linkEnabled
    }
    if (!next.linkLabel && fromLibrary.linkLabel) next.linkLabel = fromLibrary.linkLabel
    if (!next.linkUrl && fromLibrary.linkUrl) next.linkUrl = fromLibrary.linkUrl
    changed = true
  }

  if (next.usp !== undefined) {
    delete next.usp
    changed = true
  }

  if (!next._key) {
    next._key = blockKey()
    changed = true
  }

  return changed ? next : item
}

/** @returns {{ blocks: unknown[] | undefined, changed: boolean, itemsInlined: number }} */
function transformUspBlock(block, libraryById) {
  if (!block || block._type !== "uspBlock" || !Array.isArray(block.items)) {
    return { blocks: undefined, changed: false, itemsInlined: 0 }
  }

  let itemsInlined = 0
  const items = block.items.map((item) => {
    const hadLibrary = item?.source === "bibliotheek" || item?.usp?._ref
    const next = inlineUspItem(item, libraryById)
    if (hadLibrary && next !== item) itemsInlined += 1
    return next
  })

  const changed = items.some((item, i) => item !== block.items[i])
  if (!changed) return { blocks: undefined, changed: false, itemsInlined: 0 }

  return {
    blocks: undefined,
    block: { ...block, items },
    changed: true,
    itemsInlined,
  }
}

/** @returns {{ blocks: unknown[], changed: boolean, itemsInlined: number }} */
function transformBlocks(blocks, libraryById) {
  if (!Array.isArray(blocks)) return { blocks, changed: false, itemsInlined: 0 }

  let changed = false
  let itemsInlined = 0

  const nextBlocks = blocks.map((block) => {
    if (!block || typeof block !== "object") return block

    const uspResult = transformUspBlock(block, libraryById)
    if (uspResult.changed && uspResult.block) {
      changed = true
      itemsInlined += uspResult.itemsInlined
      return uspResult.block
    }

    if (block._type === "tabsBlock") {
      let tabChanged = false
      let tabItemsInlined = 0

      const tabs = Array.isArray(block.tabs)
        ? block.tabs.map((tab) => {
            if (!tab || !Array.isArray(tab.blocks)) return tab
            const result = transformBlocks(tab.blocks, libraryById)
            if (result.changed) {
              tabChanged = true
              tabItemsInlined += result.itemsInlined
              return { ...tab, blocks: result.blocks }
            }
            return tab
          })
        : block.tabs

      const inPageNavContent = Array.isArray(block.inPageNavContent)
        ? (() => {
            const result = transformBlocks(block.inPageNavContent, libraryById)
            if (result.changed) {
              tabChanged = true
              tabItemsInlined += result.itemsInlined
              return result.blocks
            }
            return block.inPageNavContent
          })()
        : block.inPageNavContent

      if (tabChanged) {
        changed = true
        itemsInlined += tabItemsInlined
        return { ...block, tabs, inPageNavContent }
      }
    }

    return block
  })

  return { blocks: nextBlocks, changed, itemsInlined }
}

const pages = await client.fetch(
  `*[_type == "page" && defined(blocks)]{ _id, title, "slug": slug.current, blocks }`,
)

const libraryDocs = await client.fetch(
  `*[_type == "usp"]{ _id, title, description, linkEnabled, linkLabel, linkUrl }`,
)

/** @type {Record<string, unknown>} */
const libraryById = Object.fromEntries(libraryDocs.map((doc) => [doc._id, doc]))

let pagesPatched = 0
let totalItemsInlined = 0

for (const page of pages) {
  const { blocks: nextBlocks, changed, itemsInlined } = transformBlocks(page.blocks, libraryById)
  if (!changed) continue

  await client.patch(page._id).set({ blocks: nextBlocks }).commit({ visibility: "async" })
  pagesPatched += 1
  totalItemsInlined += itemsInlined
  console.log(`Patched ${page._id} (${page.slug ?? page.title ?? "page"}): ${itemsInlined} item(s) inlined`)
}

let libraryDeleted = 0
for (const doc of libraryDocs) {
  await client.delete(doc._id)
  libraryDeleted += 1
  console.log(`Deleted library document ${doc._id} (${doc.title ?? "USP"})`)
}

console.log(
  `Done. Patched ${pagesPatched} page(s), inlined ${totalItemsInlined} item(s), deleted ${libraryDeleted} library document(s).`,
)
