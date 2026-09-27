#!/usr/bin/env node

/**
 * sync-engine.js — Manifest-driven sync tool for the (old, pre-v3)
 * dms-engine build's `staticAssets[]` only.
 *
 * T3.13 removed this script's other two jobs along with the TSX-codegen
 * route it fed:
 *   - `manifest.pages[]` (generated diagram routes, copied into
 *     `app/solutions/<id>/`) — that route is now hand-written
 *     (`app/solutions/[id]/page.tsx`) and reads `data/engine/` instead,
 *     synced by `sync-engine-v3.js`.
 *   - `manifest.sharedComponents[]` (3D diagram-asset templates, copied into
 *     `app/(components)/diagram-assets/`) — those templates existed only to
 *     support the generated pages above.
 *
 * What's left, `staticAssets[]`, copies content unrelated to diagrams: CS
 * concept articles (`src/assets/data/concepts/**`) that `app/concepts/**`
 * fetches at runtime from `public/engine/data/concepts/`, plus a leftover
 * icon set nothing currently imports. This keeps running until that content
 * moves to a synced-data source of its own (outside this task's scope).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENGINE_DIST = path.resolve(__dirname, '../../dms-engine/dist');
const MANIFEST_PATH = path.join(ENGINE_DIST, 'manifest.json');
const DIMENSYS_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(DIMENSYS_ROOT, 'package.json');

// --- 1. Check manifest exists ---
if (!fs.existsSync(MANIFEST_PATH)) {
  console.log('⚠️  No dms-engine manifest found at', MANIFEST_PATH);
  console.log('   Skipping sync. Run dms-engine build first.');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
console.log(`📋 Syncing dms-engine v${manifest.version} (built ${manifest.generatedAt})`);

// --- 2. Sync static assets → public/ ---
console.log('\n🖼️  Syncing static assets...');
for (const asset of manifest.staticAssets) {
  const src = path.join(ENGINE_DIST, asset.source);
  const dest = path.join(DIMENSYS_ROOT, asset.target);

  if (!fs.existsSync(src)) {
    console.log(`   ⚠️  Source not found: ${src}`);
    continue;
  }

  fs.mkdirSync(dest, { recursive: true });

  const copyRecursive = (srcDir, destDir) => {
    fs.mkdirSync(destDir, { recursive: true });
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyRecursive(src, dest);
  console.log(`   ✅ ${asset.source} → ${asset.target}`);
}

// --- 3. Check & sync peer dependencies ---
console.log('\n📦 Checking peer dependencies...');
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const missing = [];

for (const [dep, requiredRange] of Object.entries(manifest.peerDependencies)) {
  if (!allDeps[dep]) {
    missing.push({ dep, version: requiredRange });
    console.log(`   ❌ Missing: ${dep}@${requiredRange}`);
  } else {
    console.log(`   ✅ ${dep}: ${allDeps[dep]}`);
  }
}

if (missing.length > 0) {
  const installCmd = missing.map(m => `${m.dep}@${m.version}`).join(' ');
  console.log(`\n📦 Installing missing dependencies...`);
  console.log(`   npm install ${installCmd}`);
  try {
    execSync(`npm install ${installCmd}`, { cwd: DIMENSYS_ROOT, stdio: 'inherit' });
    console.log('   ✅ Dependencies installed');
  } catch (err) {
    console.error('   ❌ Failed to install dependencies:', err.message);
    process.exit(1);
  }
} else {
  console.log('   All peer dependencies satisfied.');
}

console.log('\n✅ Sync complete!');
