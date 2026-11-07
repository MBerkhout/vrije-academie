#!/usr/bin/env node
/**
 * One-off Sentry onboarding verification — sends a tagged test exception to frontend + Medusa DSNs.
 * Run from repo root: node scripts/sentry-send-test-errors.mjs
 * Requires @sentry/node (installed under medusa/).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'medusa/package.json')))
const Sentry = require('@sentry/node')

function parseEnvFile(file) {
  const path = resolve(root, file)
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const MARKER = 'SENTRY_ONBOARDING_TEST'

async function send(dsn, project, environment) {
  Sentry.init({
    dsn,
    environment,
    release: 'sentry-onboarding-test',
  })
  const err = new Error(`${MARKER}: verification error for ${project}`)
  err.name = 'SentryOnboardingVerificationError'
  const eventId = Sentry.captureException(err, {
    tags: { sentry_onboarding: 'true', project },
  })
  await Sentry.flush(5000)
  await Sentry.close(2000)
  return eventId
}

const feEnv = parseEnvFile('frontend/.env')
const medusaEnv = parseEnvFile('medusa/.env')
const frontendDsn = feEnv.SENTRY_DSN
const medusaDsn = medusaEnv.SENTRY_DSN
const environment = feEnv.SENTRY_ENVIRONMENT || medusaEnv.SENTRY_ENVIRONMENT || 'development'

if (!frontendDsn || !medusaDsn) {
  console.error('Missing SENTRY_DSN in frontend/.env or medusa/.env')
  process.exit(1)
}

const frontendEventId = await send(frontendDsn, 'vrije-academie-frontend', environment)
const medusaEventId = await send(medusaDsn, 'vrije-academie-medusa', environment)

console.log(JSON.stringify({ frontendEventId, medusaEventId, marker: MARKER }, null, 2))
