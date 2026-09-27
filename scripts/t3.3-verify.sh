#!/bin/bash
# One-shot production verification for T3.3 (build, start, Playwright, stop).
# Run this under `flock` on the shared heavy-build lock so it never overlaps
# another agent's build/start on this host, e.g.:
#
#   flock /path/to/heavy.lock ./scripts/t3.3-verify.sh
#
# Builds with webpack (Turbopack panics on a symlinked node_modules), starts
# the production server on :3000, runs the production-appropriate Playwright
# specs against it (both projects, capped workers), then stops the server.
#
# Scope note: `e2e/dev-ui-*.spec.ts` and `e2e/player-drilldown.spec.ts` /
# `player-static-blueprint.spec.ts` all go through `/dev/ui` or `/dev/player`,
# which are dev-only routes (404 in production by design — same gating as
# `/dev/worker`, see `production-runtime-assets.spec.ts`). They're excluded
# here, not because anything regressed, but because they need the dev
# server this script deliberately doesn't start.
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${T3_3_LOGDIR:-/tmp/t3.3-verify}"
mkdir -p "$LOGDIR"

echo "== build (webpack) =="
SKIP_PREBUILD=true npx next build --webpack 2>&1 | tee "$LOGDIR/build.log"

echo "== start =="
npx next start -p 3000 > "$LOGDIR/start.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  echo "== stop =="
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "== wait for server =="
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/ > /dev/null; then
    echo "server up after ${i}s"
    break
  fi
  sleep 1
done

echo "== playwright (production-servable specs, both projects, <=4 workers) =="
npx playwright test \
  e2e/smoke.spec.ts \
  e2e/solutions-page.spec.ts \
  e2e/server-only-paths-unreachable.spec.ts \
  e2e/production-runtime-assets.spec.ts \
  e2e/player-interactive-layer.spec.ts \
  --project=chromium --project="Mobile Chrome" --workers=4 \
  2>&1 | tee "$LOGDIR/playwright.log"

echo "== done =="
