/** PM2 config for the Medusa backend (production). */
module.exports = {
  apps: [
    {
      name: "medusa",
      cwd: __dirname,
      script: "node_modules/.bin/medusa",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 9000,
      },
      kill_timeout: 10000,
      listen_timeout: 30000,
    },
  ],
}
