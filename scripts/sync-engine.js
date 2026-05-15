#!/usr/bin/env node

/**
 * sync-engine.js — Manifest-driven sync tool
 *
 * Reads dms-engine's dist/manifest.json and synchronizes:
 * 1. Generated pages → app/solutions/
 * 2. Static assets → public/engine/
 * 3. Peer dependencies → checks package.json, installs if missing
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

// --- 2. Sync pages → app/solutions/ ---
console.log('\n📄 Syncing pages...');
for (const page of manifest.pages) {
  const src = path.join(ENGINE_DIST, page.source);
  const dest = path.join(DIMENSYS_ROOT, 'app', page.route);

  if (!fs.existsSync(src)) {
    console.log(`   ⚠️  Source not found: ${src}`);
    continue;
  }

  // Clean destination
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  // Copy all files
  const files = fs.readdirSync(src);
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  console.log(`   ✅ ${page.name} → app/${page.route}/ (${files.length} files)`);
}

// --- 3. Sync static assets → public/ ---
console.log('\n🖼️  Syncing static assets...');
for (const asset of manifest.staticAssets) {
  const src = path.join(ENGINE_DIST, asset.source);
  const dest = path.join(DIMENSYS_ROOT, asset.target);

  if (!fs.existsSync(src)) {
    console.log(`   ⚠️  Source not found: ${src}`);
    continue;
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  const copyRecursive = (srcDir, destDir) => {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyRecursive(src, dest);
  console.log(`   ✅ ${asset.source} → ${asset.target}`);
}

// --- 4. Check & sync peer dependencies ---
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
