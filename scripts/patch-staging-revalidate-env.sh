#!/usr/bin/env bash
# Patch staging server .env for Medusa → storefront cache bust (run from your machine).
# Requires: SERVER_HOST, REVALIDATE_SECRET (same as frontend ~/app/frontend/.env).
set -euo pipefail

HOST="${SERVER_HOST:?Set SERVER_HOST (same as GitHub secret)}"
SECRET="${REVALIDATE_SECRET:?Set REVALIDATE_SECRET (same as frontend staging .env)}"
PLP_URL="${STOREFRONT_REVALIDATE_PLP_URL:-https://v2.vrijeacademie.nl/api/revalidate/plp}"

REMOTE_SCRIPT="$(cat <<'EOS'
set -euo pipefail
ENV_FILE=~/app/medusa/.env
touch "$ENV_FILE"
upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}
upsert STOREFRONT_REVALIDATE_PLP_URL "__PLP_URL__"
upsert STOREFRONT_REVALIDATE_SECRET "__SECRET__"
echo "==> Medusa .env updated; reloading PM2"
cd ~/app/medusa && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save
EOS
)"

REMOTE_SCRIPT="${REMOTE_SCRIPT/__PLP_URL__/$PLP_URL}"
REMOTE_SCRIPT="${REMOTE_SCRIPT/__SECRET__/$SECRET}"

echo "==> Patching medusa@$HOST"
ssh -o BatchMode=yes "medusa@${HOST}" "bash -s" <<< "$REMOTE_SCRIPT"
echo "==> Done"
