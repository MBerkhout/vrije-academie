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
# Discard tracked local edits on the server so deploy cannot be blocked by a dirty tree.
# Gitignored files (e.g. .env) are left untouched.
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"
# `medusa build` typechecks every file under src/. reset --hard does not remove
# untracked files, so a leftover script on the server (bad import, never committed)
# fails the deploy. Ignored files stay.
git clean -fd -- medusa/src

cd "$APP_DIR"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
npm ci
export SENTRY_RELEASE="${SENTRY_RELEASE:-$(git -C "$REPO_DIR" rev-parse HEAD)}"
npm run build

PM2_MEDUSA_INSTANCES="$(
  node -e "const { loadDotEnv, resolveCluster } = require('$REPO_DIR/scripts/pm2-sizing.cjs'); loadDotEnv('$APP_DIR'); console.log(resolveCluster('$APP_DIR', 'medusa').instances)"
)"
echo "==> PM2 medusa target instances: $PM2_MEDUSA_INSTANCES"

# Production start serves admin from public/admin; build writes dist/public/admin
mkdir -p public
rm -rf public/admin
ln -sfn ../dist/public/admin public/admin

# --execute-all-links skips the interactive "Select tables to DELETE" prompt
# (removed module links) so migrate cannot hang in non-interactive SSH/CI.
npx medusa db:migrate --execute-all-links

# startOrReload re-applies ecosystem.config.cjs (instances, exec_mode, etc.) on every
# deploy instead of blindly reloading whatever process object already exists in PM2 —
# `pm2 reload <name>` alone can leave a process stuck in a stale mode (e.g. fork instead
# of cluster) if it was ever started outside this config.
#
# One-time migration to the server/worker split: an existing `medusa` cluster keeps its old
# instance count on startOrReload, so recreate it when `medusa-worker` does not exist yet.
if ! pm2 describe medusa-worker >/dev/null 2>&1 && pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "==> First server/worker split: recreating $PM2_APP_NAME"
  pm2 delete "$PM2_APP_NAME"
fi
echo "==> startOrReload PM2 processes from ecosystem.config.cjs: $PM2_APP_NAME + medusa-worker"
pm2 startOrReload ecosystem.config.cjs --update-env
bash "$REPO_DIR/scripts/pm2-scale-cluster.sh" "$PM2_APP_NAME" "$PM2_MEDUSA_INSTANCES"
pm2 save

# Warm PLP + Agenda listing snapshots so the first visitor after deploy avoids a ~3–4s cold build.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  PUBLISHABLE_KEY="$(psql "$DATABASE_URL" -t -A -c "select token from api_key where type='publishable' limit 1" 2>/dev/null | grep '^pk_' || true)"
  if [ -n "$PUBLISHABLE_KEY" ]; then
    curl -sf -o /dev/null "http://127.0.0.1:${PORT:-9000}/store/events?limit=1" \
      -H "x-publishable-api-key: $PUBLISHABLE_KEY" || true
    curl -sf -o /dev/null "http://127.0.0.1:${PORT:-9000}/store/agenda?limit=1" \
      -H "x-publishable-api-key: $PUBLISHABLE_KEY" || true
    WARM_HANDLES="$(
      curl -sf "http://127.0.0.1:${PORT:-9000}/store/events?limit=8&offset=0&sort=order" \
        -H "x-publishable-api-key: $PUBLISHABLE_KEY" \
        | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);const h=(j.events||[]).map(e=>e.handle).filter(Boolean);console.log(h.join(' '));}catch{}})"
    )"
    for h in $WARM_HANDLES; do
      curl -sf -o /dev/null "http://127.0.0.1:${PORT:-9000}/store/events/${h}" \
        -H "x-publishable-api-key: $PUBLISHABLE_KEY" || true
    done
  fi
fi

echo "==> Medusa deploy complete"
