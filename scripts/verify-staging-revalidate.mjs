#!/usr/bin/env node
/**
 * Smoke-test staging revalidate + Medusa store API.
 * Usage: set env from loadtest/config.env or export vars, then:
 *   node scripts/verify-staging-revalidate.mjs
 */
const base = (process.env.BASE_URL || 'https://v2.vrijeacademie.nl').replace(/\/$/, '')
const medusa = (process.env.MEDUSA_URL || 'https://medusastag.vrijeacademie.nl').replace(/\/$/, '')
const secret = process.env.REVALIDATE_SECRET?.trim()
const pk = process.env.PUBLISHABLE_KEY?.trim()

const checks = []

async function check(name, fn) {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (e) {
    checks.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}

await check('storefront home', async () => {
  const res = await fetch(`${base}/`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
})

await check('revalidate PLP (auth)', async () => {
  if (!secret) throw new Error('REVALIDATE_SECRET not set')
  const res = await fetch(`${base}/api/revalidate/plp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plp: true, agenda: true }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
})

await check('revalidate PDP tags', async () => {
  if (!secret) throw new Error('REVALIDATE_SECRET not set')
  const res = await fetch(`${base}/api/revalidate/plp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdpHandles: ['rondleiding-chez-matisse'] }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!json.tags?.some((t) => t.startsWith('pdp:'))) {
    throw new Error(`missing pdp tags: ${JSON.stringify(json)}`)
  }
})

await check('medusa /store/events', async () => {
  if (!pk) throw new Error('PUBLISHABLE_KEY not set')
  const res = await fetch(`${medusa}/store/events?limit=1`, {
    headers: { 'x-publishable-api-key': pk },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
})

for (const c of checks) {
  console.log(c.ok ? `OK  ${c.name}` : `FAIL ${c.name}: ${c.error}`)
}

if (checks.some((c) => !c.ok)) process.exit(1)
