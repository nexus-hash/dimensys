#!/bin/bash
# prebuild.sh — One-shot build of dms-engine + sync to dimensys
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
  echo "   Continuing with existing generated files (if any)..."
  exit 0
fi

echo "🔧 Building dms-engine..."
cd "$ENGINE_DIR"
npm install --silent
npm run build

echo ""
echo "🔄 Syncing to dimensys..."
cd -
node "$SCRIPT_DIR/sync-engine.js"

echo ""
echo "✅ Prebuild complete."
