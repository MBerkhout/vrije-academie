#!/usr/bin/env bash
# PM2 entrypoint: Medusa crashes (OOM) must not write multi-GB core.* files into the app cwd.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ulimit -c 0 2>/dev/null || true
exec "$ROOT/node_modules/.bin/medusa" "$@"