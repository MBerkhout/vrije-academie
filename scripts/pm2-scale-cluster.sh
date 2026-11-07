#!/usr/bin/env bash
# Scale a PM2 cluster app when instance count in ecosystem.config.cjs differs from running processes.
# Usage: pm2-scale-cluster.sh <app_name> <desired_instances>
set -euo pipefail

APP="${1:?app name}"
DESIRED="${2:?desired instance count}"

if ! pm2 describe "$APP" >/dev/null 2>&1; then
  exit 0
fi

CURRENT="$(pm2 jlist 2>/dev/null | node -e "
const fs = require('fs');
const apps = JSON.parse(fs.readFileSync(0, 'utf8'));
const count = apps.filter((x) => x.name === process.argv[1]).length;
console.log(count);
" "$APP" 2>/dev/null || echo "0")"

if [[ "$CURRENT" != "$DESIRED" ]] && [[ "$DESIRED" -gt 0 ]]; then
  echo "==> Scaling $APP from $CURRENT to $DESIRED instances"
  pm2 scale "$APP" "$DESIRED" || true
fi
