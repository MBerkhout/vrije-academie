#!/usr/bin/env bash
# Best-effort warm of Next.js hard-cached PLP/Agenda listings after deploy.
# Non-fatal: exits 0 even when paths fail (e.g. Medusa still restarting).

set -uo pipefail

BASE="${STOREFRONT_WARM_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
MAX_ATTEMPTS="${STOREFRONT_WARM_ATTEMPTS:-5}"
RETRY_DELAY_SEC="${STOREFRONT_WARM_RETRY_DELAY_SEC:-3}"
CURL_MAX_TIME="${STOREFRONT_WARM_MAX_TIME_SEC:-120}"

PATHS=(
  '/ons-aanbod'
  '/ons-aanbod?sort=start_date'
  '/agenda'
  '/agenda?sort=start_date_desc'
)

warm_path() {
  local path="$1"
  local url="${BASE}${path}"
  local attempt=1

  while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
    if curl -sf --max-time "$CURL_MAX_TIME" -o /dev/null "$url"; then
      echo "==> Warm OK: $path (attempt $attempt)"
      return 0
    fi
    echo "==> Warm retry $attempt/$MAX_ATTEMPTS failed: $path"
    attempt=$((attempt + 1))
    if [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; then
      sleep "$RETRY_DELAY_SEC"
    fi
  done

  echo "==> WARN: could not warm $path after $MAX_ATTEMPTS attempts" >&2
  return 1
}

echo "==> Warming listing caches at $BASE"
failed=0
for path in "${PATHS[@]}"; do
  warm_path "$path" || failed=$((failed + 1))
done

if [[ "$failed" -gt 0 ]]; then
  echo "==> Warm finished with $failed path(s) still failing (deploy continues)" >&2
fi

exit 0
