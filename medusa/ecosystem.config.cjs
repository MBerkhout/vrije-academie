/**
 * PM2 config for the Medusa backend (production).
 * `medusa` serves HTTP only; `medusa-worker` runs subscribers, scheduled jobs and
 * the Redis event-bus queue, so heavy background work cannot take the API down.
 */
module.exports = {
  apps: [
    {
      name: "medusa",
      cwd: __dirname,
      script: "node_modules/.bin/medusa",
      args: "start",
      instances: -1,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 9000,
        MEDUSA_WORKER_MODE: "server",
      },
      kill_timeout: 10000,
      listen_timeout: 30000,
    },
    {
      name: "medusa-worker",
      cwd: __dirname,
      script: "node_modules/.bin/medusa",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1536M",
      env: {
        NODE_ENV: "production",
        // Not proxied; only avoids clashing with the cluster on 9000.
        PORT: 9001,
        MEDUSA_WORKER_MODE: "worker",
        DISABLE_MEDUSA_ADMIN: "true",
      },
      kill_timeout: 30000,
      listen_timeout: 30000,
    },
  ],
}
