#!/usr/bin/env bash
set -euo pipefail

# Server-side deploy for the frontend user.
# GitHub Actions only SSHes in and runs this script; build work stays on the server.

REPO_DIR="${REPO_DIR:-$HOME/app}"
APP_DIR="$REPO_DIR/frontend"
PM2_APP_NAME="${PM2_APP_NAME:-frontend}"
BRANCH="${DEPLOY_BRANCH:-staging}"

echo "==> Deploying frontend from branch: $BRANCH"

cd "$REPO_DIR"
git fetch origin "$BRANCH"
# Discard tracked local edits on the server so deploy cannot be blocked by a dirty tree.
# Gitignored files (e.g. .env) are left untouched.
git checkout -f "$BRANCH"
git reset --hard "origin/$BRANCH"

cd "$APP_DIR"
npm ci
npm run build

# startOrReload re-applies ecosystem.config.cjs (instances, exec_mode, etc.) on every
# deploy instead of blindly reloading whatever process object already exists in PM2 —
# `pm2 reload <name>` alone can leave a process stuck in a stale mode (e.g. fork instead
# of cluster) if it was ever started outside this config.
echo "==> startOrReload PM2 process from ecosystem.config.cjs: $PM2_APP_NAME"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "==> Frontend deploy complete"
