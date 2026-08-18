/**
 * Deploy hosted Sanity Studio with env loaded from sanity/.env.
 *
 * Usage (from sanity/):
 *   npm run deploy
 *
 * Requires SANITY_AUTH_TOKEN with sanity.project/deployStudio (and ideally
 * deploySchema). Do not reuse SANITY_API_WRITE_TOKEN unless that token also
 * has deploy grants.
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
  !process.env.SANITY_AUTH_TOKEN && 'SANITY_AUTH_TOKEN',
].filter(Boolean)

if (missing.length) {
  console.error(
    `Missing env: ${missing.join(', ')}. Create sanity/.env or export vars in the shell.`,
  )
  process.exit(1)
}

if (
  process.env.SANITY_API_WRITE_TOKEN &&
  process.env.SANITY_AUTH_TOKEN === process.env.SANITY_API_WRITE_TOKEN
) {
  console.warn(
    'Note: SANITY_AUTH_TOKEN equals SANITY_API_WRITE_TOKEN. Deploy needs a token with ' +
      'Deploy Studio permission (sanity.io/manage → API → Tokens).',
  )
}

const result = spawnSync(process.execPath, [sanityBin, 'deploy', ...extraArgs], {
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.status !== 0) {
  console.error(
    '\nStudio deploy failed. Create a deploy token at https://sanity.io/manage → API → Tokens ' +
      '(enable Deploy Studio), set SANITY_AUTH_TOKEN in sanity/.env, or run: npx sanity login',
  )
}

process.exit(result.status ?? 1)
