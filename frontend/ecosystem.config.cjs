/** PM2 config for the Next.js frontend (production). Sizing: ../scripts/pm2-sizing.cjs */
const path = require("path")
const { loadDotEnv, resolveCluster, formatSizingLog } = require("../scripts/pm2-sizing.cjs")

loadDotEnv(__dirname)
const sizing = resolveCluster(__dirname, "frontend")
// eslint-disable-next-line no-console
console.log(formatSizingLog("frontend", sizing))

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "frontend",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start",
      instances: sizing.instances,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: sizing.max_memory_restart,
      env: {
        NODE_ENV: "production",
        PORT: sizing.port,
        NODE_OPTIONS: sizing.nodeOptions,
        SENTRY_RELEASE: process.env.SENTRY_RELEASE,
      },
      kill_timeout: parseInt(process.env.PM2_KILL_TIMEOUT_MS, 10) || 5000,
      listen_timeout: parseInt(process.env.PM2_LISTEN_TIMEOUT_MS, 10) || 10000,
    },
  ],
}
