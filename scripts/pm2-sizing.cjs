/**
 * Shared PM2 sizing for frontend + Medusa on a single host (Postgres, Redis, OpenSearch co-located).
 * Override via PM2_* env vars; optional `.env` in the app cwd is merged when ecosystem loads.
 */
const fs = require("fs")
const os = require("os")
const path = require("path")

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function parsePositiveInt(raw, fallback) {
  if (raw == null || raw === "") return fallback
  const n = Number.parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseMemoryMb(raw, fallbackMb) {
  if (raw == null || raw === "") return fallbackMb
  const s = String(raw).trim()
  const g = /^(\d+(?:\.\d+)?)\s*g$/i.exec(s)
  if (g) return Math.round(Number(g[1]) * 1024)
  const m = /^(\d+)\s*m?$/i.exec(s)
  if (m) return Number(m[1])
  return fallbackMb
}

function pm2MemoryString(mb) {
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024}G`
  if (mb >= 1024) return `${(mb / 1024).toFixed(1).replace(/\.0$/, "")}G`
  return `${mb}M`
}

/** Load KEY=VALUE lines from `.env` without overwriting existing process.env. */
function loadDotEnv(cwd) {
  const file = path.join(cwd, ".env")
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, "utf8")
  for (const line of text.split("\n")) {
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
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = val
    }
  }
}

function totalMemMb() {
  return Math.floor(os.totalmem() / (1024 * 1024))
}

function reserveMb() {
  return parsePositiveInt(process.env.PM2_RESERVED_MB, 3500)
}

function nodeBudgetMb() {
  return Math.max(512, totalMemMb() - reserveMb())
}

function fitInstances(requested, capMb, shareMb) {
  let instances = requested
  while (instances > 1 && instances * capMb > shareMb) {
    instances -= 1
  }
  const cap = Math.min(capMb, Math.max(256, Math.floor(shareMb / instances)))
  return { instances, capMb: cap }
}

function defaultWorkerCapMb(budgetMb) {
  if (parseInt(process.env.PM2_MEDUSA_WORKER_MAX_MEMORY, 10)) {
    return parseMemoryMb(process.env.PM2_MEDUSA_WORKER_MAX_MEMORY, 1024)
  }
  return budgetMb >= 10_000 ? 1536 : 1024
}

function resolveCluster(appCwd, role) {
  loadDotEnv(appCwd)
  const cpus = os.cpus().length
  const budget = nodeBudgetMb()
  const workerCap = defaultWorkerCapMb(budget)
  const pool = Math.max(256, budget - workerCap)
  const half = Math.floor(pool / 2)

  const defaultInstances = clamp(cpus - 1, 2, 6)
  const maxCap = parsePositiveInt(process.env.PM2_MAX_INSTANCE_MB, 1024)

  if (role === "frontend") {
    const requested = parsePositiveInt(process.env.PM2_FRONTEND_INSTANCES, defaultInstances)
    const overrideCap = process.env.PM2_FRONTEND_MAX_MEMORY
      ? parseMemoryMb(process.env.PM2_FRONTEND_MAX_MEMORY, maxCap)
      : maxCap
    const { instances, capMb } = fitInstances(requested, overrideCap, half)
    return {
      instances,
      max_memory_restart: pm2MemoryString(capMb),
      nodeOptions: `--max-old-space-size=${Math.floor(capMb * 0.75)}`,
      port: parsePositiveInt(process.env.PORT, 3000),
      budgetMb: budget,
      shareMb: half,
    }
  }

  if (role === "medusa") {
    const requested = parsePositiveInt(process.env.PM2_MEDUSA_INSTANCES, defaultInstances)
    const overrideCap = process.env.PM2_MEDUSA_MAX_MEMORY
      ? parseMemoryMb(process.env.PM2_MEDUSA_MAX_MEMORY, maxCap)
      : maxCap
    const { instances, capMb } = fitInstances(requested, overrideCap, half)
    return {
      instances,
      max_memory_restart: pm2MemoryString(capMb),
      nodeOptions: `--max-old-space-size=${Math.floor(capMb * 0.75)}`,
      port: parsePositiveInt(process.env.PORT, 9000),
      budgetMb: budget,
      shareMb: half,
    }
  }

  if (role === "medusa-worker") {
    const capMb = parseMemoryMb(process.env.PM2_MEDUSA_WORKER_MAX_MEMORY, workerCap)
    return {
      instances: 1,
      max_memory_restart: pm2MemoryString(capMb),
      nodeOptions: `--max-old-space-size=${Math.floor(capMb * 0.75)}`,
      port: parsePositiveInt(process.env.MEDUSA_WORKER_PORT, 9001),
      budgetMb: budget,
      shareMb: workerCap,
    }
  }

  throw new Error(`Unknown PM2 role: ${role}`)
}

function formatSizingLog(role, sizing) {
  return `PM2 ${role}: instances=${sizing.instances} max_memory=${sizing.max_memory_restart} node_budget≈${sizing.budgetMb}M share≈${sizing.shareMb}M`
}

module.exports = {
  clamp,
  loadDotEnv,
  resolveCluster,
  formatSizingLog,
  totalMemMb,
  reserveMb,
  nodeBudgetMb,
}
