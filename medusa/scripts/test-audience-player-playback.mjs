/**
 * Proof-of-concept: Audience Player token + play config for article/asset.
 *
 * Usage (from medusa/):
 *   node scripts/test-audience-player-playback.mjs
 *   node scripts/test-audience-player-playback.mjs --email=test@example.com --article=339 --asset=200
 *
 * Required in medusa/.env:
 *   AUDIENCE_PLAYER_OAUTH_CLIENT_ID
 *   AUDIENCE_PLAYER_OAUTH_CLIENT_SECRET
 * Optional:
 *   AUDIENCE_PLAYER_PROJECT_ID=14
 *   AUDIENCE_PLAYER_API_URL=https://api.audienceplayer.com
 *   AUDIENCE_PLAYER_TEST_EMAIL=test@example.com
 */

import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const envPath = join(scriptDir, "..", ".env")

function loadEnv() {
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue
    const body = arg.slice(2)
    const eq = body.indexOf("=")
    if (eq <= 0) continue
    out[body.slice(0, eq)] = body.slice(eq + 1)
  }
  return out
}

async function graphqlUser(projectId, apiBaseUrl, query) {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/graphql/${projectId}/user`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })
  const json = await response.json()
  return { status: response.status, json }
}

function redactToken(value) {
  if (!value || typeof value !== "string") return value
  if (value.length <= 12) return "[redacted]"
  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} chars)`
}

function summarizePlayConfig(data) {
  if (!data) return null
  return {
    duration: data.duration ?? null,
    aspect_ratio: data.aspect_ratio ?? null,
    pulse_token: redactToken(data.pulse_token),
    entitlements: Array.isArray(data.entitlements)
      ? data.entitlements.map((e) => ({
          mime_type: e.mime_type,
          manifest: e.manifest ? "[present]" : null,
          expires_in: e.expires_in ?? null,
          token: redactToken(e.token),
        }))
      : [],
  }
}

loadEnv()

const args = parseArgs(process.argv.slice(2))
const clientId =
  process.env.AUDIENCE_PLAYER_OAUTH_CLIENT_ID?.trim() ||
  process.env.AUDIENCE_PLAYER_CLIENT_ID?.trim()
const clientSecret =
  process.env.AUDIENCE_PLAYER_OAUTH_CLIENT_SECRET?.trim() ||
  process.env.AUDIENCE_PLAYER_CLIENT_SECRET?.trim()
const projectId = Number(process.env.AUDIENCE_PLAYER_PROJECT_ID ?? 14)
const apiBaseUrl = process.env.AUDIENCE_PLAYER_API_URL?.trim() || "https://api.audienceplayer.com"
const email =
  args.email?.trim() ||
  process.env.AUDIENCE_PLAYER_TEST_EMAIL?.trim() ||
  "vathuis-poc-test@vrijeacademie.nl"
const articleId = Number(args.article ?? 339)
const assetId = Number(args.asset ?? 200)
const autoRegister = args["auto-register"] !== "false"

if (!clientId || !clientSecret) {
  console.error(
    "Missing Audience Player OAuth credentials in medusa/.env (AUDIENCE_PLAYER_CLIENT_ID + AUDIENCE_PLAYER_CLIENT_SECRET, or AUDIENCE_PLAYER_OAUTH_CLIENT_ID + AUDIENCE_PLAYER_OAUTH_CLIENT_SECRET)"
  )
  process.exit(1)
}

if (!args.email?.trim() && !process.env.AUDIENCE_PLAYER_TEST_EMAIL?.trim()) {
  console.log("No test email set — using default vathuis-poc-test@vrijeacademie.nl (auto_register: true)")
  console.log("")
}

if (!Number.isFinite(projectId) || !Number.isFinite(articleId) || !Number.isFinite(assetId)) {
  console.error("Invalid projectId, articleId, or assetId")
  process.exit(1)
}

console.log("Audience Player playback POC")
console.log(`  projectId: ${projectId}`)
console.log(`  articleId: ${articleId}`)
console.log(`  assetId:   ${assetId}`)
console.log(`  email:     ${email}`)
console.log("")

const authQuery = `mutation {
  ClientUserAuthenticate(
    project_id: ${projectId},
    client_id: ${JSON.stringify(clientId)},
    client_secret: ${JSON.stringify(clientSecret)},
    user_email: ${JSON.stringify(email)},
    auto_register: ${autoRegister}
  ) {
    access_token
    user_id
    user_email
    expires_in
  }
}`

console.log("Step 1: ClientUserAuthenticate …")
const authResult = await graphqlUser(projectId, apiBaseUrl, authQuery)

if (authResult.status !== 200) {
  console.error(`HTTP ${authResult.status}`, authResult.json)
  process.exit(1)
}

if (authResult.json.errors?.length) {
  console.error("GraphQL errors:", JSON.stringify(authResult.json.errors, null, 2))
  process.exit(1)
}

const auth = authResult.json.data?.ClientUserAuthenticate
if (!auth?.access_token || !auth?.user_id) {
  console.error("No access_token / user_id in response:", authResult.json)
  process.exit(1)
}

console.log("  user_id:", auth.user_id)
console.log("  user_email:", auth.user_email)
console.log("  expires_in:", auth.expires_in)
console.log("  access_token:", redactToken(auth.access_token))
console.log("")

const playQuery = `mutation {
  ClientUserArticleAssetPlay(
    project_id: ${projectId},
    client_id: ${JSON.stringify(clientId)},
    client_secret: ${JSON.stringify(clientSecret)},
    user_id: ${auth.user_id},
    article_id: ${articleId},
    asset_id: ${assetId}
  ) {
    duration
    aspect_ratio
    pulse_token
    entitlements { mime_type manifest expires_in token }
  }
}`

console.log("Step 2: ClientUserArticleAssetPlay …")
const playResult = await graphqlUser(projectId, apiBaseUrl, playQuery)

if (playResult.status !== 200) {
  console.error(`HTTP ${playResult.status}`, playResult.json)
  process.exit(1)
}

if (playResult.json.errors?.length) {
  console.error("GraphQL errors:", JSON.stringify(playResult.json.errors, null, 2))
  console.error("")
  console.error(
    "If error mentions entitlement/access: grant product access via Audience Player admin or ClientUserProductEntitlementManage."
  )
  process.exit(1)
}

const play = playResult.json.data?.ClientUserArticleAssetPlay
console.log("Play config:", JSON.stringify(summarizePlayConfig(play), null, 2))
console.log("")

console.log("Step 3: bare embed URL (expected 403 without token) …")
const embedUrl = `https://embed.audienceplayer.com/${projectId}/article/${articleId}/asset/${assetId}`
const embedCheck = await fetch(embedUrl, { method: "HEAD" })
console.log(`  ${embedUrl}`)
console.log(`  status: ${embedCheck.status}`)
console.log("")

if (play?.pulse_token || play?.entitlements?.length) {
  console.log("SUCCESS: Audience Player returned playback config with token(s).")
  console.log("Next: wire embed-player SDK in frontend with articleId, assetId, and user token.")
} else {
  console.log("WARNING: Play mutation succeeded but returned no tokens — check AP product entitlements.")
}
