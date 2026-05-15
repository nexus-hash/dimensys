#!/bin/bash
# dev-engine.sh — Watch dms-engine for changes, rebuild + sync on save
set -e

ENGINE_DIR="../dms-engine"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$ENGINE_DIR" ]; then
  echo "⚠️  dms-engine not found at $ENGINE_DIR"
  echo "   Clone it alongside dimensys to enable live diagram development."
  exit 0
fi

echo "👁️  Watching dms-engine for changes..."
cd "$ENGINE_DIR"
npx chokidar-cli 'src/**/*.ts' 'src/**/*.tsx' 'data/**/*.json' \
  -c "echo '🔄 Change detected...' && npm run build && node $SCRIPT_DIR/sync-engine.js" \
  --initial
