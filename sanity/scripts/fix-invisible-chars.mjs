/**
 * Finds zero-width / BOM / bidi characters in Sanity documents (they break URLs when pasted).
 *
 * Usage:
 *   npm run fix:invisible-chars --prefix sanity            # report only (dry run)
 *   npm run fix:invisible-chars --prefix sanity -- --fix   # strip from URL-like fields
 *
 * `--fix` only touches URL-like fields (`handle`, `slug.current`, `*Url`, `url`, `href`).
 * Other fields (e.g. rich text) are reported but left unchanged.
 */

import { createClient } from "@sanity/client"
import { loadEnvFromSanityDir } from "./load-env.mjs"

loadEnvFromSanityDir()

const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g
const URL_LIKE_KEY = /^(handle|current|url|href|[a-zA-Z]*Url)$/

const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.SANITY_STUDIO_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN
const apply = process.argv.includes("--fix")

if (!projectId || !token) {
  console.error("Missing project id or SANITY_API_WRITE_TOKEN")
  process.exit(1)
}

const client = createClient({ projectId, dataset, apiVersion: "2024-01-01", token, useCdn: false })

/** Yields `{ path, key, value }` for every string that contains an invisible character. */
function* findHits(node, path = []) {
  if (typeof node === "string") {
    if (new RegExp(INVISIBLE.source).test(node)) {
      yield { path, key: path[path.length - 1], value: node }
    }
    return
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const item = node[i]
      const seg = item && typeof item === "object" && item._key ? `[_key=="${item._key}"]` : `[${i}]`
      yield* findHits(item, [...path, seg])
    }
    return
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("_") && k !== "_id") continue
      yield* findHits(v, [...path, k])
    }
  }
}

const toPathString = (path) => path.join(".").replace(/\.\[/g, "[")

const docs = await client.fetch(`*[!(_type match "system.*") && !(_id in path("_.**"))]`)

let reported = 0
let fixed = 0

for (const doc of docs) {
  const hits = [...findHits(doc)]
  if (!hits.length) continue

  const set = {}
  for (const hit of hits) {
    reported++
    const fixable = URL_LIKE_KEY.test(String(hit.key))
    const clean = hit.value.replace(INVISIBLE, "").trim()
    console.log(
      `${doc._id} (${doc._type}) ${toPathString(hit.path)} → ${JSON.stringify(clean.slice(0, 80))}` +
        `${fixable ? "" : "  [not auto-fixed]"}`,
    )
    if (fixable) set[toPathString(hit.path)] = clean
  }

  if (apply && Object.keys(set).length) {
    await client.patch(doc._id).set(set).commit()
    fixed += Object.keys(set).length
  }
}

console.log(
  `\n${reported} field(s) with invisible characters.` +
    (apply ? ` ${fixed} fixed.` : " Dry run — re-run with --fix to clean URL-like fields."),
)
