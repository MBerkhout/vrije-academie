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
npm run migrate

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "==> Reloading PM2 process: $PM2_APP_NAME"
  pm2 reload "$PM2_APP_NAME" --update-env
else
  echo "==> Starting PM2 process for the first time: $PM2_APP_NAME"
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo "==> Medusa deploy complete"
