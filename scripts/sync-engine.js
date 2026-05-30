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
// NOTE: We do in-place updates (overwrite files, remove stale ones)
// instead of deleting the directory. Deleting breaks Next.js hot reload
// because the file watcher loses the route registration.
console.log('\n📄 Syncing pages...');
for (const page of manifest.pages) {
  const src = path.join(ENGINE_DIST, page.source);
  const dest = path.join(DIMENSYS_ROOT, 'app', page.route);

  if (!fs.existsSync(src)) {
    console.log(`   ⚠️  Source not found: ${src}`);
    continue;
  }

  fs.mkdirSync(dest, { recursive: true });

  // Overwrite all source files into destination
  const srcFiles = fs.readdirSync(src);
  for (const file of srcFiles) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }

  // Remove stale files that no longer exist in source
  const destFiles = fs.readdirSync(dest);
  for (const file of destFiles) {
    if (!srcFiles.includes(file)) {
      fs.rmSync(path.join(dest, file), { force: true });
    }
  }
  console.log(`   ✅ ${page.name} → app/${page.route}/ (${srcFiles.length} files)`);
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

// --- 3b. Sync shared components → app/(components)/ ---
if (manifest.sharedComponents && manifest.sharedComponents.length > 0) {
  console.log('\n🧩 Syncing shared components...');
  for (const comp of manifest.sharedComponents) {
    const src = path.join(ENGINE_DIST, comp.source);
    const dest = path.join(DIMENSYS_ROOT, comp.target);

    if (!fs.existsSync(src)) {
      console.log(`   ⚠️  Source not found: ${src}`);
      continue;
    }

    fs.mkdirSync(dest, { recursive: true });

    const srcFiles = fs.readdirSync(src);
    for (const file of srcFiles) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }

    // Remove stale files
    const destFiles = fs.readdirSync(dest);
    for (const file of destFiles) {
      if (!srcFiles.includes(file)) {
        fs.rmSync(path.join(dest, file), { force: true });
      }
    }
    console.log(`   ✅ ${comp.source} → ${comp.target} (${srcFiles.length} files)`);
  }
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
