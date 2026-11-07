/**
 * PM2 config for the Medusa backend (production).
 * `medusa` serves HTTP only; `medusa-worker` runs subscribers, scheduled jobs and
 * the Redis event-bus queue. Sizing: ../scripts/pm2-sizing.cjs
 */
const path = require("path")
const { loadDotEnv, resolveCluster, formatSizingLog } = require("../scripts/pm2-sizing.cjs")

loadDotEnv(__dirname)
const api = resolveCluster(__dirname, "medusa")
const worker = resolveCluster(__dirname, "medusa-worker")
// eslint-disable-next-line no-console
console.log(formatSizingLog("medusa", api))
// eslint-disable-next-line no-console
console.log(formatSizingLog("medusa-worker", worker))

module.exports = {
  apps: [
    {
      name: process.env.PM2_MEDUSA_APP_NAME || "medusa",
      cwd: __dirname,
      script: "node_modules/.bin/medusa",
      args: "start",
      instances: api.instances,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: api.max_memory_restart,
      env: {
        NODE_ENV: "production",
        PORT: api.port,
        MEDUSA_WORKER_MODE: "server",
        NODE_OPTIONS: api.nodeOptions,
      },
      kill_timeout: parseInt(process.env.PM2_KILL_TIMEOUT_MS, 10) || 10000,
      listen_timeout: parseInt(process.env.PM2_LISTEN_TIMEOUT_MS, 10) || 30000,
    },
    {
      name: "medusa-worker",
      cwd: __dirname,
      script: "node_modules/.bin/medusa",
      args: "start",
      instances: worker.instances,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: worker.max_memory_restart,
      env: {
        NODE_ENV: "production",
        PORT: worker.port,
        MEDUSA_WORKER_MODE: "worker",
        DISABLE_MEDUSA_ADMIN: "true",
        NODE_OPTIONS: worker.nodeOptions,
      },
      kill_timeout: parseInt(process.env.PM2_WORKER_KILL_TIMEOUT_MS, 10) || 30000,
      listen_timeout: parseInt(process.env.PM2_WORKER_LISTEN_TIMEOUT_MS, 10) || 30000,
    },
  ],
}
