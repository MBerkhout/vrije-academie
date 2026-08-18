/**
 * Deploy Sanity workspace schemas with env loaded from sanity/.env.
 * Maps SANITY_API_WRITE_TOKEN → SANITY_AUTH_TOKEN when the CLI token is missing.
 *
 * Usage (from sanity/):
 *   npm run schema:deploy
 *
 * Note: sanity@6.0.0 can SIGABRT on `schemas deploy` without output. This script
 * retries with `sanity@latest` when that happens.
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadEnvFromSanityDir } from './load-env.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sanityBin = join(scriptDir, '..', 'node_modules', 'sanity', 'bin', 'sanity')
const extraArgs = process.argv.slice(2)

loadEnvFromSanityDir({ override: true })

if (!process.env.SANITY_AUTH_TOKEN) {
  process.env.SANITY_AUTH_TOKEN =
    process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN || ''
}

const missing = [
  !process.env.SANITY_STUDIO_PROJECT_ID && 'SANITY_STUDIO_PROJECT_ID',
  !process.env.SANITY_STUDIO_DATASET && 'SANITY_STUDIO_DATASET',
  !process.env.SANITY_AUTH_TOKEN && 'SANITY_AUTH_TOKEN (or SANITY_API_WRITE_TOKEN)',
].filter(Boolean)

if (missing.length) {
  console.error(
    `Missing env: ${missing.join(', ')}. Create sanity/.env or export vars in the shell.`,
  )
  process.exit(1)
}

const nodeMajor = Number(process.versions.node.split('.')[0])
const nodeMinor = Number(process.versions.node.split('.')[1] ?? 0)
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 12)) {
  console.error(
    `Node.js >=22.12 required for Sanity CLI (current: ${process.version}).\n` +
      'Use: nvm install 22 && nvm use 22',
  )
  process.exit(1)
}

function runSchemasDeploy(useLatest) {
  const command = useLatest ? 'npx' : process.execPath
  const args = useLatest
    ? ['--yes', 'sanity@latest', 'schemas', 'deploy', ...extraArgs]
    : [sanityBin, 'schemas', 'deploy', ...extraArgs]

  return spawnSync(command, args, { stdio: 'inherit', env: process.env })
}

let result = runSchemasDeploy(false)

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.signal === 'SIGABRT' || result.signal === 'SIGSEGV') {
  console.warn(
    `\nLocal Sanity CLI exited with ${result.signal} (known issue in sanity@6.0.0). Retrying with sanity@latest…\n`,
  )
  result = runSchemasDeploy(true)
}

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.status !== 0) {
  if (result.signal) {
    console.error(
      `\nSchema deploy failed (${result.signal}). Try: nvm use 22 && npm run schema:deploy`,
    )
  } else {
    console.error(
      '\nSchema deploy failed. Ensure SANITY_AUTH_TOKEN (or SANITY_API_WRITE_TOKEN) includes ' +
        'sanity.project/deploySchema and sanity.project/deployStudio grants.\n' +
        'Create a token at https://sanity.io/manage or run: npx sanity login',
    )
  }
}

process.exit(result.status ?? 1)
