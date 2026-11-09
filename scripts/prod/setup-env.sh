#!/usr/bin/env bash
# Create production ~/app/frontend/.env and ~/app/medusa/.env on prod1 by copying
# integration secrets from staging and applying production URLs / fresh auth secrets.
#
# Run on prod1 (or via SSH) after both OS users exist and ~/app is cloned on main.
#
# Required env:
#   STAGING_SSH_HOST          — staging server (same host as GitHub SERVER_HOST)
# Optional:
#   STAGING_SSH_KEY           — path to SSH private key (default: ~/.ssh/id_rsa)
#   PROD_DATABASE_URL         — Postgres URL for production Medusa (prompt if unset)
#   PROD_REDIS_URL            — Redis URL on prod1 (prompt if unset)
#   MEDUSA_OUT                — default ~/app/medusa/.env
#   FRONTEND_OUT              — default ~/app/frontend/.env
#
# Usage:
#   STAGING_SSH_HOST=staging.example.nl PROD_DATABASE_URL=postgres://... PROD_REDIS_URL=redis://127.0.0.1:6379/0 \
#     bash scripts/prod/setup-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGING_HOST="${STAGING_SSH_HOST:?Set STAGING_SSH_HOST}"
SSH_KEY="${STAGING_SSH_KEY:-$HOME/.ssh/id_rsa}"
MEDUSA_OUT="${MEDUSA_OUT:-$HOME/app/medusa/.env}"
FRONTEND_OUT="${FRONTEND_OUT:-$HOME/app/frontend/.env}"

PROD_STOREFRONT="https://prod.vrijeacademie.nl"
PROD_MEDUSA="https://medusa.vrijeacademie.nl"

ssh_cmd() {
  local user="$1"
  shift
  ssh -o BatchMode=yes -i "$SSH_KEY" "${user}@${STAGING_HOST}" "$@"
}

fetch_staging_env() {
  local user="$1"
  local app="$2"
  ssh_cmd "$user" "set -euo pipefail; test -f ~/app/${app}/.env; cat ~/app/${app}/.env"
}

env_value() {
  local file="$1" key="$2"
  local line
  line="$(grep -m1 "^${key}=" "$file" 2>/dev/null || true)"
  [[ -n "$line" ]] || return 1
  printf '%s' "${line#*=}"
}

upsert_line() {
  local file="$1" key="$2" val="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  local esc_val
  esc_val=$(printf '%s' "$val" | sed 's/[|&\\]/\\&/g')
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

apply_from_staging() {
  local dest="$1"
  local src="$2"
  shift 2
  local keys=("$@") k val
  for k in "${keys[@]}"; do
    if val="$(env_value "$src" "$k")"; then
      upsert_line "$dest" "$k" "$val"
    fi
  done
}

prompt_if_empty() {
  local varname="$1" prompt_text="$2"
  if [[ -z "${!varname:-}" ]]; then
    read -r -p "$prompt_text: " "$varname"
  fi
}

TMP_STAGING_MEDUSA="$(mktemp)"
TMP_STAGING_FE="$(mktemp)"
trap "rm -f \"$TMP_STAGING_MEDUSA\" \"$TMP_STAGING_FE\"" EXIT

echo "==> Fetching staging medusa .env from medusa@${STAGING_HOST}"
fetch_staging_env medusa medusa >"$TMP_STAGING_MEDUSA"
echo "==> Fetching staging frontend .env from frontend@${STAGING_HOST}"
fetch_staging_env frontend frontend >"$TMP_STAGING_FE"


prompt_if_empty PROD_DATABASE_URL "PROD_DATABASE_URL (Postgres for prod Medusa)"
prompt_if_empty PROD_REDIS_URL "PROD_REDIS_URL (must use noeviction policy)"

JWT_NEW="$(openssl rand -hex 32)"
COOKIE_NEW="$(openssl rand -hex 32)"
REVALIDATE_NEW="$(openssl rand -hex 32)"

# --- Medusa: copy integration keys from staging ---
MEDUSA_COPY_KEYS=(
  SALESFORCE_LOGIN_URL SALESFORCE_CLIENT_ID SALESFORCE_CLIENT_SECRET SALESFORCE_REFRESH_TOKEN
  SALESFORCE_DEFAULT_PRICEBOOK2_ID SALESFORCE_DISCOUNT_PRODUCT2_ID
  SALESFORCE_PERSON_ACCOUNT_RECORD_TYPE_ID SALESFORCE_MEDUSA_CUSTOM_FIELDS
  SALESFORCE_WEBHOOK_QUEUE_BATCH_SIZE SALESFORCE_WEBHOOK_QUEUE_CONCURRENCY
  SALESFORCE_WEBHOOK_DEFER_LOADAVG SALESFORCE_WEBHOOK_DEFER_FREE_MB
  AUDIENCE_PLAYER_CLIENT_ID AUDIENCE_PLAYER_CLIENT_SECRET AUDIENCE_PLAYER_PROJECT_ID
  AUDIENCE_PLAYER_API_URL AUDIENCE_PLAYER_PUBLIC_EMBED_HOST AUDIENCE_PLAYER_PREVIEW_EMAIL
  RESEND_API_KEY RESEND_FROM
  SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_IGNORE_TLS SMTP_USER SMTP_PASS SMTP_FROM
  SENDGRID_API_KEY SENDGRID_FROM
  OPENSEARCH_NODE OPENSEARCH_USERNAME OPENSEARCH_PASSWORD SEARCH_INDEX SANITY_SEARCH_WEBHOOK_SECRET
  SGTM_ENABLED SGTM_ENDPOINT_URL SGTM_EVENT_PATH SGTM_PURCHASE_SECRET SGTM_API_KEY_HEADER SGTM_DEBUG SGTM_PREVIEW_HEADER
  MOLLIE_API_KEY
  HUBSPOT_TOKEN
  SENTRY_DSN SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT
)

if [[ -f "$MEDUSA_OUT" ]]; then
  echo "==> Backing up existing $MEDUSA_OUT"
  cp -a "$MEDUSA_OUT" "${MEDUSA_OUT}.bak.$(date +%Y%m%d%H%M%S)"
else
  cp "$ROOT/medusa/.env.template" "$MEDUSA_OUT"
fi

apply_from_staging "$MEDUSA_OUT" "$TMP_STAGING_MEDUSA" "${MEDUSA_COPY_KEYS[@]}"

upsert_line "$MEDUSA_OUT" DATABASE_URL "$PROD_DATABASE_URL"
upsert_line "$MEDUSA_OUT" REDIS_URL "$PROD_REDIS_URL"
upsert_line "$MEDUSA_OUT" JWT_SECRET "$JWT_NEW"
upsert_line "$MEDUSA_OUT" COOKIE_SECRET "$COOKIE_NEW"
upsert_line "$MEDUSA_OUT" MEDUSA_URL "$PROD_MEDUSA"
upsert_line "$MEDUSA_OUT" SALESFORCE_OAUTH_CALLBACK_URL "${PROD_MEDUSA}/hooks/salesforce/oauth/callback"
upsert_line "$MEDUSA_OUT" SALESFORCE_OAUTH_RETURN_URL "${PROD_MEDUSA}/app/salesforce-sync"
upsert_line "$MEDUSA_OUT" MOLLIE_REDIRECT_URL "${PROD_STOREFRONT}/bedankt"
upsert_line "$MEDUSA_OUT" STOREFRONT_PUBLIC_URL "$PROD_STOREFRONT"
upsert_line "$MEDUSA_OUT" STORE_CORS "$PROD_STOREFRONT"
upsert_line "$MEDUSA_OUT" ADMIN_CORS "$PROD_MEDUSA,$PROD_STOREFRONT"
upsert_line "$MEDUSA_OUT" AUTH_CORS "$PROD_MEDUSA,$PROD_STOREFRONT"
upsert_line "$MEDUSA_OUT" STOREFRONT_REVALIDATE_PLP_URL "${PROD_STOREFRONT}/api/revalidate/plp"
upsert_line "$MEDUSA_OUT" STOREFRONT_REVALIDATE_SECRET "$REVALIDATE_NEW"
upsert_line "$MEDUSA_OUT" SENTRY_ENVIRONMENT "production"
upsert_line "$MEDUSA_OUT" SENTRY_TRACES_SAMPLE_RATE "0.2"
upsert_line "$MEDUSA_OUT" PERF_PROBE_STOREFRONT_HOME "${PROD_STOREFRONT}/"
upsert_line "$MEDUSA_OUT" PERF_PROBE_STOREFRONT_PLP "${PROD_STOREFRONT}/ons-aanbod"
upsert_line "$MEDUSA_OUT" PERF_PROBE_MEDUSA_EVENTS "${PROD_MEDUSA}/store/events?limit=24&sort=order"

# --- Frontend ---
FE_COPY_KEYS=(
  NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET SANITY_API_READ_TOKEN
  NEXT_PUBLIC_SANITY_STUDIO_URL
  NEXT_PUBLIC_MEDUSA_API_KEY
  NEXT_PUBLIC_GTM_ID NEXT_PUBLIC_GTM_ENABLED
  HUBSPOT_TOKEN NEXT_PUBLIC_HUBSPOT_PORTAL_ID NEXT_PUBLIC_HUBSPOT_REGION
  SENTRY_DSN SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT
)

if [[ -f "$FRONTEND_OUT" ]]; then
  echo "==> Backing up existing $FRONTEND_OUT"
  cp -a "$FRONTEND_OUT" "${FRONTEND_OUT}.bak.$(date +%Y%m%d%H%M%S)"
else
  cp "$ROOT/frontend/.env.example" "$FRONTEND_OUT"
fi

apply_from_staging "$FRONTEND_OUT" "$TMP_STAGING_FE" "${FE_COPY_KEYS[@]}"

PK_FROM_STAGING="$(env_value "$TMP_STAGING_FE" NEXT_PUBLIC_MEDUSA_API_KEY || true)"
if [[ -z "$PK_FROM_STAGING" ]]; then
  PK_FROM_STAGING="$(env_value "$TMP_STAGING_MEDUSA" NEXT_PUBLIC_MEDUSA_API_KEY || true)"
fi

upsert_line "$FRONTEND_OUT" REDIS_URL "$PROD_REDIS_URL"
upsert_line "$FRONTEND_OUT" NEXT_PUBLIC_MEDUSA_BACKEND_URL "$PROD_MEDUSA"
upsert_line "$FRONTEND_OUT" NEXT_PUBLIC_SITE_URL "https://vrijeacademie.nl"
upsert_line "$FRONTEND_OUT" NEXT_PUBLIC_STOREFRONT_PUBLIC_URL "$PROD_STOREFRONT"
upsert_line "$FRONTEND_OUT" NEXT_PUBLIC_MEDUSA_API_KEY "$PK_FROM_STAGING"
upsert_line "$FRONTEND_OUT" REVALIDATE_SECRET "$REVALIDATE_NEW"
upsert_line "$FRONTEND_OUT" SANITY_STUDIO_REVALIDATE_SECRET "$REVALIDATE_NEW"
SANITY_WEBHOOK_SECRET="$(env_value "$TMP_STAGING_FE" SANITY_REVALIDATE_SECRET || true)"
upsert_line "$FRONTEND_OUT" SANITY_REVALIDATE_SECRET "$SANITY_WEBHOOK_SECRET"
upsert_line "$FRONTEND_OUT" SANITY_STUDIO_MEDUSA_ADMIN_URL "$PROD_MEDUSA"
upsert_line "$FRONTEND_OUT" SENTRY_ENVIRONMENT "production"
upsert_line "$FRONTEND_OUT" SENTRY_TRACES_SAMPLE_RATE "0.2"
FE_SENTRY_DSN="$(env_value "$TMP_STAGING_FE" SENTRY_DSN || true)"
upsert_line "$FRONTEND_OUT" NEXT_PUBLIC_SENTRY_DSN "$FE_SENTRY_DSN"

chmod 600 "$MEDUSA_OUT" "$FRONTEND_OUT" 2>/dev/null || true

echo ""
echo "==> Wrote $MEDUSA_OUT and $FRONTEND_OUT"
echo "==> Manual review required:"
echo "    - MOLLIE_API_KEY: use live key for production (staging may be test_*)"
echo "    - Salesforce: confirm production Connected App / login URL if not sandbox"
echo "    - SANITY_REVALIDATE_SECRET: re-use staging HMAC secret for webhook, or configure a new webhook for $PROD_STOREFRONT"
echo "    - Copy GitHub secret SANITY_STUDIO_REVALIDATE_SECRET_PROD = REVALIDATE_SECRET (same as SANITY_STUDIO_REVALIDATE_SECRET on frontend)"
echo "    - NEXT_PUBLIC_MEDUSA_API_KEY: after DB copy from staging, publishable key token matches staging DB (no change needed)"
echo "    - Add CORS origin $PROD_STOREFRONT in Sanity project settings"
echo "    - Add Sanity webhook URL ${PROD_STOREFRONT}/api/revalidate/sanity (see docs/DEPLOYMENT.md)"
