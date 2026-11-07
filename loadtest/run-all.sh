#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$ROOT/config.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/config.env"
  set +a
fi

for script in browse pdp-hot-cold spike api-only checkout-light; do
  echo "==> k6 $script"
  k6 run "$ROOT/scenarios/${script}.js"
done
