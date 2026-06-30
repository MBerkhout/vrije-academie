#!/usr/bin/env node
/**
 * Expose local Medusa (port 9000) via a Cloudflare quick tunnel so Mollie can POST webhooks.
 *
 * Usage: npm run tunnel
 *
 * After the public URL appears:
 * 1. Set MEDUSA_URL=<url> in medusa/.env (no trailing slash)
 * 2. Restart Medusa (npm run dev)
 *
 * Keep this process running while testing payments.
 */
import { spawn } from "node:child_process"

const MEDUSA_PORT = process.env.MEDUSA_PORT ?? "9000"
const target = `http://localhost:${MEDUSA_PORT}`

console.log(`Starting Cloudflare quick tunnel → ${target}`)
console.log("Waiting for public URL…\n")

const child = spawn("cloudflared", ["tunnel", "--url", target], {
  stdio: ["inherit", "pipe", "pipe"],
})

const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i
let announced = false

function handleLine(line) {
  process.stdout.write(`${line}\n`)

  const match = line.match(urlPattern)
  if (match && !announced) {
    announced = true
    const url = match[0]
    console.log("\n--- Mollie webhook setup ---")
    console.log(`MEDUSA_URL=${url}`)
    console.log("Add the line above to medusa/.env, then restart Medusa.")
    console.log(`Webhook example: ${url}/hooks/payment/pp_mollie-ideal_mollie`)
    console.log("----------------------------\n")
  }
}

child.stdout.on("data", (chunk) => {
  for (const line of chunk.toString().split("\n")) {
    if (line.trim()) handleLine(line)
  }
})

child.stderr.on("data", (chunk) => {
  for (const line of chunk.toString().split("\n")) {
    if (line.trim()) handleLine(line)
  }
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})

process.on("SIGINT", () => child.kill("SIGINT"))
process.on("SIGTERM", () => child.kill("SIGTERM"))
