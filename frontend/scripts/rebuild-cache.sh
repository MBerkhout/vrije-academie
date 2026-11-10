#!/usr/bin/env bash
# Best-effort full storefront ISR refresh after deploy (no restart).
# Non-fatal: exits 0 even when the endpoint or warm curls fail.

set -uo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

BASE="${STOREFRONT_WARM_URL:-http://127.0.0.1:3000}"
BASE="${BASE%/}"
SECRET="${REVALIDATE_SECRET:-}"
MAX_ATTEMPTS="${STOREFRONT_CACHE_REBUILD_ATTEMPTS:-5}"
RETRY_DELAY_SEC="${STOREFRONT_CACHE_REBUILD_RETRY_DELAY_SEC:-3}"
CURL_MAX_TIME="${STOREFRONT_CACHE_REBUILD_MAX_TIME_SEC:-120}"

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

if [[ -z "$SECRET" ]]; then
  echo "==> WARN: REVALIDATE_SECRET not set; skipping POST /api/revalidate/all" >&2
else
  echo "==> Queueing storefront cache rebuild at ${BASE}/api/revalidate/all"
  http_code="$(
    curl -s --max-time "$CURL_MAX_TIME" -o /tmp/revalidate-all-response.json -w '%{http_code}' \
      -X POST "${BASE}/api/revalidate/all" \
      -H "Authorization: Bearer ${SECRET}" \
      -H 'Content-Type: application/json' \
      --data '{}'
  )"
  if [[ "$http_code" == "200" ]]; then
    body="$(cat /tmp/revalidate-all-response.json 2>/dev/null || true)"
    echo "==> Revalidate queued: ${body}"
  else
    echo "==> WARN: POST /api/revalidate/all failed (HTTP ${http_code})" >&2
  fi
fi

echo "==> Regenerating sitemap.xml, robots.txt, and homepage"
failed=0
for path in '/sitemap.xml' '/robots.txt' '/'; do
  warm_path "$path" || failed=$((failed + 1))
done

if [[ "$failed" -gt 0 ]]; then
  echo "==> Cache rebuild finished with $failed path(s) still failing (deploy continues)" >&2
fi

exit 0
