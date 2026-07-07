/**
 * Inline referenced block documents into page.blocks / product.body / nested tab arrays.
 * Required after block schemas change from type "document" to type "object".
 *
 * Usage (from repo root):
 *   DRY_RUN=1 npm run migrate:blocks-inline --prefix sanity
 *   npm run migrate:blocks-inline --prefix sanity
 *   DELETE_ORPHANS=1 npm run migrate:blocks-inline --prefix sanity
 *
 * Requires SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_DATASET, SANITY_API_WRITE_TOKEN
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
const deleteOrphans = process.env.DELETE_ORPHANS === "1" || process.env.DELETE_ORPHANS === "true"

/** Block types that were documents and may appear as _ref stubs in arrays. */
const BLOCK_TYPES = new Set([
  "eventList",
  "textBlock",
  "afbeeldingBlock",
  "whitespaceBlock",
  "tabsBlock",
  "formBlock",
  "demandNearbyBlock",
  "heroBlock",
  "productRowBlock",
  "categoriesBlock",
  "uspBlock",
  "reviewBlock",
  "personsBlock",
  "columnsBlock",
  "editorialCardsBlock",
  "accordionBlock",
  "plpBlock",
  "giftCardBlock",
  "vathuisHeroBlock",
  "vathuisCategoriesBlock",
  "vathuisProductRowBlock",
  "vathuisTeachersBlock",
  "vathuisPromoTilesBlock",
])

const DOC_META_KEYS = ["_id", "_rev", "_createdAt", "_updatedAt", "_ref"]

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

/** @type {Map<string, Record<string, unknown> | null>} */
const refCache = new Map()

/** @type {Set<string>} */
const inlinedRefIds = new Set()

/**
 * @param {string} ref
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function fetchBlockDocument(ref) {
  if (refCache.has(ref)) return refCache.get(ref) ?? null

  const doc = await client.fetch(
    `coalesce(*[_id == "drafts." + $ref][0], *[_id == $ref][0])`,
    { ref },
  )

  refCache.set(ref, doc ?? null)
  return doc ?? null
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {Record<string, unknown>}
 */
function stripDocumentMeta(doc) {
  /** @type {Record<string, unknown>} */
  const next = { ...doc }
  for (const key of DOC_META_KEYS) {
    delete next[key]
  }
  return next
}

/**
 * @param {unknown} block
 * @returns {Promise<{ block: unknown, changed: boolean, inlinedCount: number }>}
 */
async function transformBlock(block) {
  if (!block || typeof block !== "object") {
    return { block, changed: false, inlinedCount: 0 }
  }

  /** @type {Record<string, unknown>} */
  const item = /** @type {Record<string, unknown>} */ (block)
  let changed = false
  let inlinedCount = 0

  const ref = typeof item._ref === "string" ? item._ref : null
  const type = typeof item._type === "string" ? item._type : null

  /** @type {Record<string, unknown>} */
  let working = item

  if (ref && type && BLOCK_TYPES.has(type)) {
    const doc = await fetchBlockDocument(ref)
    if (!doc) {
      console.warn(`  Warning: missing block document for ref ${ref} (${type})`)
    } else {
      working = {
        ...stripDocumentMeta(doc),
        _type: doc._type ?? type,
        _key: item._key,
      }
      changed = true
      inlinedCount += 1
      inlinedRefIds.add(ref)
      const draftRef = ref.startsWith("drafts.") ? ref : `drafts.${ref}`
      inlinedRefIds.add(draftRef)
    }
  }

  if (working._type === "tabsBlock") {
    const tabs = Array.isArray(working.tabs) ? working.tabs : null
    if (tabs) {
      const nextTabs = []
      let tabsChanged = false
      for (const tab of tabs) {
        if (!tab || typeof tab !== "object" || !Array.isArray(tab.blocks)) {
          nextTabs.push(tab)
          continue
        }
        const result = await transformBlocksArray(tab.blocks)
        if (result.changed) tabsChanged = true
        inlinedCount += result.inlinedCount
        nextTabs.push({ ...tab, blocks: result.blocks })
      }
      if (tabsChanged) {
        working = { ...working, tabs: nextTabs }
        changed = true
      }
    }

    const inPageNavContent = Array.isArray(working.inPageNavContent)
      ? working.inPageNavContent
      : null
    if (inPageNavContent) {
      const result = await transformBlocksArray(inPageNavContent)
      if (result.changed) {
        working = { ...working, inPageNavContent: result.blocks }
        changed = true
      }
      inlinedCount += result.inlinedCount
    }
  }

  return { block: working, changed, inlinedCount }
}

/**
 * @param {unknown[] | undefined | null} blocks
 * @returns {Promise<{ blocks: unknown[], changed: boolean, inlinedCount: number }>}
 */
async function transformBlocksArray(blocks) {
  if (!Array.isArray(blocks)) {
    return { blocks: blocks ?? [], changed: false, inlinedCount: 0 }
  }

  let changed = false
  let inlinedCount = 0
  const nextBlocks = []

  for (const block of blocks) {
    const result = await transformBlock(block)
    if (result.changed) changed = true
    inlinedCount += result.inlinedCount
    nextBlocks.push(result.block)
  }

  return { blocks: nextBlocks, changed, inlinedCount }
}

const pages = await client.fetch(
  `*[_type == "page" && defined(blocks)]{ _id, title, "slug": slug.current, blocks }`,
)
const products = await client.fetch(
  `*[_type == "product" && defined(body)]{ _id, title, handle, body }`,
)

let parentsPatched = 0
let totalInlined = 0

for (const page of pages) {
  const result = await transformBlocksArray(page.blocks)
  if (!result.changed) continue

  totalInlined += result.inlinedCount
  parentsPatched += 1
  const label = page.slug ?? page.title ?? page._id
  console.log(
    `${dryRun ? "[dry-run] " : ""}Page ${page._id} (${label}): inlined ${result.inlinedCount} block ref(s)`,
  )

  if (!dryRun) {
    await client.patch(page._id).set({ blocks: result.blocks }).commit({ visibility: "async" })
  }
}

for (const product of products) {
  const result = await transformBlocksArray(product.body)
  if (!result.changed) continue

  totalInlined += result.inlinedCount
  parentsPatched += 1
  const label = product.handle ?? product.title ?? product._id
  console.log(
    `${dryRun ? "[dry-run] " : ""}Product ${product._id} (${label}): inlined ${result.inlinedCount} block ref(s)`,
  )

  if (!dryRun) {
    await client.patch(product._id).set({ body: result.blocks }).commit({ visibility: "async" })
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}Done. Patched ${parentsPatched} parent document(s), inlined ${totalInlined} block ref(s).`,
)

if (deleteOrphans) {
  const blockTypeList = [...BLOCK_TYPES]
  const orphanDocs = await client.fetch(
    `*[_type in $types && !(_id in path("drafts.**"))]{ _id, _type }`,
    { types: blockTypeList },
  )

  let deleted = 0
  for (const doc of orphanDocs) {
    const baseId = doc._id.replace(/^drafts\./, "")
    if (inlinedRefIds.has(doc._id) || inlinedRefIds.has(baseId)) {
      if (!dryRun) {
        await client.delete(doc._id)
      }
      deleted += 1
      console.log(`${dryRun ? "[dry-run] " : ""}Deleted orphan ${doc._id} (${doc._type})`)
    }
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Deleted ${deleted} orphaned block document(s).`)
} else if (inlinedRefIds.size > 0) {
  console.log(
    `Inlined ${inlinedRefIds.size} unique ref id(s). Run with DELETE_ORPHANS=1 after verification to remove orphaned block documents.`,
  )
}
