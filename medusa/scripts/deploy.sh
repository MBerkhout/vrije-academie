#!/usr/bin/env bash
set -euo pipefail

# Server-side deploy for the medusa user.
# GitHub Actions only SSHes in and runs this script; build work stays on the server.

REPO_DIR="${REPO_DIR:-$HOME/app}"
APP_DIR="$REPO_DIR/medusa"
PM2_APP_NAME="${PM2_APP_NAME:-medusa}"
BRANCH="${DEPLOY_BRANCH:-staging}"

echo "==> Deploying medusa from branch: $BRANCH"

cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR"
npm ci
npm run build

# Production start serves admin from public/admin; build writes dist/public/admin
mkdir -p public
rm -rf public/admin
ln -sfn ../dist/public/admin public/admin

npm run migrate

# startOrReload re-applies ecosystem.config.cjs (instances, exec_mode, etc.) on every
# deploy instead of blindly reloading whatever process object already exists in PM2 —
# `pm2 reload <name>` alone can leave a process stuck in a stale mode (e.g. fork instead
# of cluster) if it was ever started outside this config.
echo "==> startOrReload PM2 process from ecosystem.config.cjs: $PM2_APP_NAME"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# Warm PLP listing snapshot so the first visitor after deploy avoids a ~3–4s cold build.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  PUBLISHABLE_KEY="$(psql "$DATABASE_URL" -t -A -c "select token from api_key where type='publishable' limit 1" 2>/dev/null | grep '^pk_' || true)"
  if [ -n "$PUBLISHABLE_KEY" ]; then
    curl -sf -o /dev/null "http://127.0.0.1:${PORT:-9000}/store/events?limit=1" \
      -H "x-publishable-api-key: $PUBLISHABLE_KEY" || true
  fi
fi

echo "==> Medusa deploy complete"
