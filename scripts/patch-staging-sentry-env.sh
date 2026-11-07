#!/usr/bin/env bash
# Upsert Sentry variables in staging ~/app/*/.env and reload PM2.
# Requires: SERVER_HOST, SENTRY_AUTH_TOKEN, and DSNs (from env or repo .env files).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${SERVER_HOST:?Set SERVER_HOST (staging server IP or hostname)}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_va_dev}"

read_env() {
  local file="$1" key="$2"
  if [[ -f "$file" ]]; then
    grep -m1 "^${key}=" "$file" | cut -d= -f2- || true
  fi
}

FE_DSN="${SENTRY_DSN_FRONTEND:-$(read_env "$ROOT/frontend/.env" SENTRY_DSN)}"
ME_DSN="${SENTRY_DSN_MEDUSA:-$(read_env "$ROOT/medusa/.env" SENTRY_DSN)}"
AUTH="${SENTRY_AUTH_TOKEN:?Set SENTRY_AUTH_TOKEN}"
ORG="${SENTRY_ORG:-vrije-academie}"
ENV_NAME="${SENTRY_ENVIRONMENT_STAGING:-staging}"

if [[ -z "$FE_DSN" || -z "$ME_DSN" ]]; then
  echo "Missing frontend or medusa SENTRY_DSN"
  exit 1
fi

ssh_base=(ssh -o BatchMode=yes -i "$SSH_KEY")

patch_user_env() {
  local user="$1" app="$2"
  shift 2
  local -a pairs=("$@")

  echo "==> Patching ${user}@${HOST} ($app)"
  local script='set -euo pipefail
ENV_FILE=~/app/'"$app"'/.env
touch "$ENV_FILE"
upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}
'

  for pair in "${pairs[@]}"; do
    local k="${pair%%=*}"
    local v="${pair#*=}"
    # escape & for sed delimiter issues — values are URLs/tokens without |
    script+="upsert $(printf '%q' "$k") $(printf '%q' "$v")"$'\n'
  done

  if [[ "$app" == "frontend" ]]; then
    script+='
cd ~/app/frontend && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save
'
  elif [[ "$app" == "medusa" ]]; then
    script+='
cd ~/app/medusa && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save
'
  fi

  "${ssh_base[@]}" "${user}@${HOST}" "bash -s" <<< "$script"
}

patch_user_env frontend frontend \
  "SENTRY_DSN=$FE_DSN" \
  "NEXT_PUBLIC_SENTRY_DSN=$FE_DSN" \
  "SENTRY_ENVIRONMENT=$ENV_NAME" \
  "SENTRY_ORG=$ORG" \
  "SENTRY_PROJECT=vrije-academie-frontend" \
  "SENTRY_AUTH_TOKEN=$AUTH"

patch_user_env medusa medusa \
  "SENTRY_DSN=$ME_DSN" \
  "SENTRY_ENVIRONMENT=$ENV_NAME" \
  "SENTRY_ORG=$ORG" \
  "SENTRY_PROJECT=vrije-academie-medusa"

echo "==> Staging Sentry env updated"
