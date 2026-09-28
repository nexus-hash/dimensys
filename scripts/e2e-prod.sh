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
# `e2e/dev-ui-*.spec.ts` and
# `e2e/player-static-blueprint.spec.ts` aren't run here; they need the dev
# server (`npm run dev:next` + the default Playwright config).
#
# Usage: npm run test:e2e:prod                      (full suite)
#        npm run test:e2e:prod -- e2e/foo.spec.ts   (only these specs; any
#                                                     extra Playwright args pass through)
# The build is skipped when neither the source nor the synced engine data
# changed since the last build (E2E_FORCE_BUILD=1 forces it).
# For a heavy shared host, wrap it in a lock so it never overlaps another
# build: flock /path/to/some.lock ./scripts/e2e-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."

LOGDIR="${E2E_PROD_LOGDIR:-$PWD/.e2e-prod}"
WORKERS="${E2E_WORKERS:-8}"
# Its own port, so a running `npm run dev` on 3000 is never hit or killed.
PORT="${E2E_PROD_PORT:-3100}"
mkdir -p "$LOGDIR"

# Build key: tracked + untracked source (excluding build/log output) and the
# synced engine manifest. Unchanged key + an existing build = skip the build.
build_key() {
  {
    git rev-parse HEAD
    git status --porcelain --untracked-files=all -- . ':!.next' ':!.e2e-prod' ':!test-results' ':!playwright-report'
    git diff HEAD -- . ':!.next'
    git ls-files --others --exclude-standard -z -- . ':!.next' ':!.e2e-prod' | xargs -0 -r cat 2>/dev/null
    cat data/engine/manifest.json 2>/dev/null
  } | sha256sum | cut -d' ' -f1
}
KEY="$(build_key)"
KEY_FILE=.next/.e2e-build-key
if [ -z "${E2E_FORCE_BUILD:-}" ] && [ -f .next/BUILD_ID ] && [ "$(cat "$KEY_FILE" 2>/dev/null)" = "$KEY" ]; then
  echo "== build: unchanged since the last build, skipped =="
else
  echo "== build (webpack) =="
  SKIP_PREBUILD=true npx next build --webpack 2>&1 | tee "$LOGDIR/build.log"
  echo "$KEY" > "$KEY_FILE"
fi

echo "== start =="
# A plain `&` background here would only track `npx`'s own pid: `npx next start`
# actually chains npx -> `npm exec` -> `sh -c "next" start` -> the real
# `next-server` process, none of which is a child job control kills; `setsid`
# puts the whole chain in a fresh process group so it can be torn down as one.
setsid npx next start -p "$PORT" > "$LOGDIR/start.log" 2>&1 &
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
  fuser -k "$PORT"/tcp 2>/dev/null || true
  leftover="$(lsof -t -i:"$PORT" 2>/dev/null || true)"
  if [ -n "$leftover" ]; then kill -9 $leftover 2>/dev/null || true; fi
}
trap cleanup EXIT

# Let Playwright reuse this server: its default probe is a dev-only page.
export PW_BASE_URL="http://localhost:$PORT"
export PW_READY_URL="$PW_BASE_URL/"

echo "== wait for server =="
for i in $(seq 1 60); do
  if curl -sf "http://localhost:$PORT/" > /dev/null; then
    echo "server up after ${i}s"
    break
  fi
  sleep 1
done

echo "== playwright (both projects, $WORKERS workers) =="
DEFAULT_SPECS=(
  e2e/smoke.spec.ts
  e2e/home-page.spec.ts
  e2e/solutions-page.spec.ts
  e2e/server-only-paths-unreachable.spec.ts
  e2e/production-runtime-assets.spec.ts
  e2e/player-interactive-layer.spec.ts
  e2e/player-board-fit.spec.ts
  e2e/player-inspector.spec.ts
  e2e/player-inspector-advanced.spec.ts
  e2e/player-label-geometry.spec.ts
  e2e/player-hud-timeline.spec.ts
  e2e/player-frames.spec.ts
  e2e/player-break-it.spec.ts
  e2e/player-walkthrough.spec.ts
  e2e/player-scale.spec.ts
  e2e/player-cost.spec.ts
  e2e/player-cache-pack.spec.ts
  e2e/player-rail.spec.ts
  e2e/player-scenarios.spec.ts
  e2e/player-share.spec.ts
  e2e/player-phone.spec.ts
)
if [ "$#" -gt 0 ]; then ARGS=("$@"); else ARGS=("${DEFAULT_SPECS[@]}"); fi

npx playwright test "${ARGS[@]}" \
  --project=chromium --project="Mobile Chrome" --workers="$WORKERS" \
  2>&1 | tee "$LOGDIR/playwright.log"

echo "== done =="
