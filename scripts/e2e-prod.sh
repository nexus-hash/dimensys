#!/bin/bash
# e2e-prod.sh — build (webpack), start, run the production-appropriate
# Playwright specs, then stop. No dev server involved.
#
# Turbopack panics in a worktree with a symlinked node_modules, so this
# always builds with `--webpack`; `next start` then serves the real build,
# which some specs need (worker bundle / sim payload delivery, bundle-size
# assumptions) that a `next dev` server can't stand in for.
#
# Scope: only specs that work against the production routes. `/dev/ui` and
# `/dev/player` are dev-only (404 in production by design, same as
# `/dev/worker` — see `e2e/production-runtime-assets.spec.ts`), so
# `e2e/dev-ui-*.spec.ts`, `e2e/player-drilldown.spec.ts` and
# `e2e/player-static-blueprint.spec.ts` aren't run here; they need the dev
# server (`npm run dev:next` + the default Playwright config).
#
# Usage: npm run test:e2e:prod
# For a heavy shared host, wrap it in a lock so it never overlaps another
# build: flock /path/to/some.lock ./scripts/e2e-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${E2E_PROD_LOGDIR:-/tmp/e2e-prod}"
mkdir -p "$LOGDIR"

echo "== build (webpack) =="
SKIP_PREBUILD=true npx next build --webpack 2>&1 | tee "$LOGDIR/build.log"

echo "== start =="
# A plain `&` background here would only track `npx`'s own pid: `npx next start`
# actually chains npx -> `npm exec` -> `sh -c "next" start` -> the real
# `next-server` process, none of which is a child job control kills; `setsid`
# puts the whole chain in a fresh process group so it can be torn down as one.
setsid npx next start -p 3000 > "$LOGDIR/start.log" 2>&1 &
SERVER_PID=$!

cleanup() {
  echo "== stop =="
  kill -- -"$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  # Belt and braces: whatever is actually bound to the port (`next start`
  # chains through npm exec/sh, and the real `next-server` worker can end up
  # reparented outside the group the kill above targets) gets torn down by
  # port instead. `lsof -t -i` came back empty in this environment even with
  # a live listener on the port, so `fuser` — which did see it — goes first.
  fuser -k 3000/tcp 2>/dev/null || true
  leftover="$(lsof -t -i:3000 2>/dev/null || true)"
  if [ -n "$leftover" ]; then kill -9 $leftover 2>/dev/null || true; fi
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
  e2e/player-board-fit.spec.ts \
  e2e/player-inspector.spec.ts \
  --project=chromium --project="Mobile Chrome" --workers=4 \
  2>&1 | tee "$LOGDIR/playwright.log"

echo "== done =="
