#!/usr/bin/env node
/**
 * Append host + storefront probe metrics (JSON lines) for correlating slow periods.
 *
 *   node scripts/host-performance-sampler.mjs >> ~/logs/va-perf-sampler.log 2>&1
 *
 * Cron (medusa user, every minute):
 *   * * * * * cd ~/app/medusa && node scripts/host-performance-sampler.mjs >> ~/logs/va-perf-sampler.log 2>&1
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"

const ts = new Date().toISOString()

function readMeminfo() {
  try {
    const raw = fs.readFileSync("/proc/meminfo", "utf8")
    const pick = (key) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"))
      return m ? Number(m[1]) * 1024 : null
    }
    return {
      memAvailableBytes: pick("MemAvailable"),
      swapTotalBytes: pick("SwapTotal"),
      swapFreeBytes: pick("SwapFree"),
    }
  } catch {
    return {}
  }
}

function pm2RestartSummary() {
  try {
    const raw = execSync("pm2 jlist 2>/dev/null", { encoding: "utf8", timeout: 15_000 })
    const apps = JSON.parse(raw)
    return apps
      .filter((p) => p.name && !p.name.startsWith("pm2-"))
      .map((p) => ({
        name: p.name,
        status: p.pm2_env?.status,
        restarts: p.pm2_env?.restart_time ?? 0,
        memoryMb: p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) : null,
      }))
  } catch {
    return []
  }
}

function curlProbe(url, extraHeaders = []) {
  const headerArgs = extraHeaders.flatMap((h) => ["-H", h])
  try {
    const out = execSync(
      [
        "curl",
        "-s",
        "-o",
        "/dev/null",
        "-w",
        "%{http_code} %{time_starttransfer} %{time_total}",
        ...headerArgs,
        url,
      ].join(" "),
      { encoding: "utf8", timeout: 120_000 }
    ).trim()
    const [code, ttfb, total] = out.split(/\s+/)
    return { url, code: Number(code), ttfbSec: Number(ttfb), totalSec: Number(total) }
  } catch (err) {
    return { url, error: err instanceof Error ? err.message : String(err) }
  }
}

const mem = readMeminfo()
const swapUsedBytes =
  mem.swapTotalBytes != null && mem.swapFreeBytes != null
    ? mem.swapTotalBytes - mem.swapFreeBytes
    : null

const base = {
  tag: "host-perf",
  ts,
  load1: os.loadavg()[0],
  load5: os.loadavg()[1],
  freememMb: Math.round(os.freemem() / 1024 / 1024),
  totalmemMb: Math.round(os.totalmem() / 1024 / 1024),
  memAvailableMb:
    mem.memAvailableBytes != null
      ? Math.round(mem.memAvailableBytes / 1024 / 1024)
      : null,
  swapUsedMb: swapUsedBytes != null ? Math.round(swapUsedBytes / 1024 / 1024) : null,
  pm2: pm2RestartSummary(),
}

const probes = [
  curlProbe(process.env.PERF_PROBE_STOREFRONT_HOME ?? "https://v2.vrijeacademie.nl/"),
  curlProbe(process.env.PERF_PROBE_STOREFRONT_PLP ?? "https://v2.vrijeacademie.nl/ons-aanbod"),
  curlProbe(
    process.env.PERF_PROBE_MEDUSA_EVENTS ??
      "https://medusa.vrijeacademie.nl/store/events?limit=24&sort=order",
    process.env.PERF_PROBE_MEDUSA_PUBLISHABLE_KEY
      ? [`x-publishable-api-key: ${process.env.PERF_PROBE_MEDUSA_PUBLISHABLE_KEY}`]
      : []
  ),
]

console.log(JSON.stringify({ ...base, probes }))
