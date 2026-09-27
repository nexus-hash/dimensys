#!/bin/bash
# prebuild.sh — One-shot build of dms-engine (both builds) + sync to dimensys
# Used for local production builds. Skipped in CI (handled by workflow).
set -e

if [ "$SKIP_PREBUILD" = "true" ]; then
  echo "⏭️  Skipping prebuild (CI mode)"
  exit 0
fi

ENGINE_DIR="../dms-engine"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$ENGINE_DIR" ]; then
  echo "⚠️  dms-engine not found at $ENGINE_DIR"
  echo "   Clone it alongside dimensys to enable diagram generation."
  echo "   Continuing with existing synced files (if any)..."
  exit 0
fi

# Old build: only its `staticAssets[]` still matters to this app (CS concept
# content under app/concepts/, synced to public/engine/data/). Its `pages[]`
# (generated diagram routes) and `sharedComponents[]` (3D diagram-asset
# templates) are no longer consumed — T3.13 replaced that whole path with
# the v3 build below.
echo "🔧 Building dms-engine..."
cd "$ENGINE_DIR"
npm install --silent
npm run build

echo ""
echo "🔄 Syncing static assets to dimensys..."
cd -
node "$SCRIPT_DIR/sync-engine.js"

echo ""
echo "🔧 Building dms-engine v3..."
cd "$ENGINE_DIR"
npm run build:v3

echo ""
echo "🔄 Syncing v3 output to dimensys..."
cd -
node "$SCRIPT_DIR/sync-engine-v3.js"

echo ""
echo "✅ Prebuild complete."
