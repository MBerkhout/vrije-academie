/** PM2 config for the Next.js frontend (production). */
module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
