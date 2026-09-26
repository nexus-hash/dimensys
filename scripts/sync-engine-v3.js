#!/usr/bin/env node

/**
 * sync-engine-v3.js — Manifest-driven sync tool for dms-engine's v3 output.
 *
 * Reads dms-engine's `dist-v3/manifest.json` and, for
 * every file it lists, verifies the file exists and its content hash is
 * correct before copying anything:
 *
 * - `server/diagrams/<id>.json` carries `{ compiled, source }`; its
 *   `compiled.hash` must equal the content hash of `source`, recomputed the
 *   same way the engine does it (sorted-key JSON, sha256, `sha256:` prefix).
 * - `public/diagrams/<id>.json` is a stripped view of the same document
 *   (interview fields removed) plus computed layouts, so it can't be
 *   rehashed against a source on its own; instead it must carry the exact
 *   same `compiled.hash` as its server counterpart (both are stamped from
 *   the same build-time `compiled` value).
 * - `public/paths/<id>.json`, `public/library/<id>.json` and
 *   `server/puzzles/<id>.json` are `{ ...doc, compiled }` with nothing else
 *   added, so `compiled.hash` is verified by recomputing the content hash of
 *   the file with `compiled` removed.
 *
 * Only once every listed file passes verification does it copy anything:
 * - `public/*`, `catalog.json`, `manifest.json` → `data/engine/` (flattening
 *   the `public/` prefix; never under `public/`).
 * - `server/*` → `server-data/engine/` (flattening the `server/` prefix;
 *   never under `public/` or `app/`).
 *
 * The sync is idempotent (a file already identical to its source is left
 * alone — mtime included) and removes files that are no longer listed in
 * the manifest from those two target directories.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENGINE_DIST_V3 = process.env.DMS_ENGINE_DIST_V3
  ? path.resolve(process.env.DMS_ENGINE_DIST_V3)
  : path.resolve(__dirname, '../../dms-engine/dist-v3');

const DIMENSYS_ROOT = process.env.DIMENSYS_ROOT
  ? path.resolve(process.env.DIMENSYS_ROOT)
  : path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(ENGINE_DIST_V3, 'manifest.json');
const DATA_ENGINE_DIR = path.join(DIMENSYS_ROOT, 'data', 'engine');
const SERVER_DATA_ENGINE_DIR = path.join(DIMENSYS_ROOT, 'server-data', 'engine');
const PUBLIC_DIR = path.join(DIMENSYS_ROOT, 'public');

// --- small path helpers ---------------------------------------------------

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** True when `child` is `parent` itself or nested inside it. */
function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// Defensive guard: the two target directories must never nest inside `public/`
// (or inside each other). This is always true for the hardcoded defaults, but
// misconfigured env var overrides should fail loudly rather than silently
// leak server-only data into a public directory.
if (isInside(SERVER_DATA_ENGINE_DIR, PUBLIC_DIR)) {
  fail(`server-data engine directory (${SERVER_DATA_ENGINE_DIR}) must not be inside public/ (${PUBLIC_DIR})`);
}
if (isInside(DATA_ENGINE_DIR, PUBLIC_DIR)) {
  fail(`data engine directory (${DATA_ENGINE_DIR}) must not be inside public/ (${PUBLIC_DIR})`);
}
if (isInside(SERVER_DATA_ENGINE_DIR, DATA_ENGINE_DIR) || isInside(DATA_ENGINE_DIR, SERVER_DATA_ENGINE_DIR)) {
  fail('data/engine and server-data/engine must not be nested inside one another');
}

// --- content hashing (mirrors dms-engine's src/compile/hash.ts) ----------

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
    return out;
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(sortKeysDeep(value));
}

/** `sha256:<hex>` content hash — same algorithm as `CompileInfo.hash`. */
function contentHash(value) {
  const digest = crypto.createHash('sha256').update(canonicalJson(value), 'utf-8').digest('hex');
  return `sha256:${digest}`;
}

/** Raw byte hash of a file on disk, used only to decide whether a copy is needed. */
function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function withoutCompiled(obj) {
  const clone = { ...obj };
  delete clone.compiled;
  return clone;
}

function assertExists(absPath, label) {
  if (!fs.existsSync(absPath)) fail(`${label} not found: ${absPath}`);
}

function readJson(absPath, label) {
  let raw;
  try {
    raw = fs.readFileSync(absPath, 'utf-8');
  } catch (err) {
    fail(`Failed to read ${label} (${absPath}): ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Failed to parse ${label} (${absPath}): ${err.message}`);
  }
  return undefined;
}

function assertHashFormat(hash, label) {
  if (typeof hash !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(hash)) {
    fail(`${label} has an invalid compiled.hash: ${JSON.stringify(hash)}`);
  }
}

/** `{...doc, compiled}` files (paths, libraries, puzzles): rehash the file with `compiled` stripped. */
function verifySelfHashed(absPath, label) {
  assertExists(absPath, label);
  const content = readJson(absPath, label);
  if (!content || typeof content !== 'object' || !content.compiled) {
    fail(`${label} is missing "compiled"`);
  }
  assertHashFormat(content.compiled.hash, label);
  const recomputed = contentHash(withoutCompiled(content));
  if (recomputed !== content.compiled.hash) {
    fail(`${label} hash mismatch: file says ${content.compiled.hash}, recomputed ${recomputed} (${absPath})`);
  }
}

/** `server/diagrams/<id>.json`: `{ compiled, source }`. `compiled.hash` must equal `contentHash(source)`. */
function verifyServerDiagram(absPath, label) {
  assertExists(absPath, label);
  const content = readJson(absPath, label);
  if (!content || typeof content !== 'object' || !content.compiled || content.source === undefined) {
    fail(`${label} is missing "compiled" or "source"`);
  }
  assertHashFormat(content.compiled.hash, label);
  const recomputed = contentHash(content.source);
  if (recomputed !== content.compiled.hash) {
    fail(`${label} hash mismatch: source hash is ${recomputed}, compiled.hash says ${content.compiled.hash} (${absPath})`);
  }
  return content;
}

/**
 * `public/diagrams/<id>.json`: a stripped, layout-augmented view of the same
 * document, so it can't be rehashed on its own — it must carry the exact
 * `compiled.hash` its server counterpart was stamped with.
 */
function verifyPublicDiagram(absPath, label, expectedHash) {
  assertExists(absPath, label);
  const content = readJson(absPath, label);
  if (!content || typeof content !== 'object' || !content.compiled) {
    fail(`${label} is missing "compiled"`);
  }
  assertHashFormat(content.compiled.hash, label);
  if (content.compiled.hash !== expectedHash) {
    fail(
      `${label} hash mismatch against its server counterpart: ${content.compiled.hash} !== ${expectedHash} (${absPath})`,
    );
  }
}

// --- copying ---------------------------------------------------------------

/** Copies `srcAbs` to `destAbs` only if the bytes differ (idempotent; preserves mtime otherwise). */
function copyIfChanged(srcAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (fs.existsSync(destAbs) && fileHash(srcAbs) === fileHash(destAbs)) {
    return false;
  }
  fs.copyFileSync(srcAbs, destAbs);
  return true;
}

/** Removes files under `rootDir` that aren't in `expectedRelPaths` (POSIX-separated, relative to `rootDir`), then prunes empty directories. */
function removeStale(rootDir, expectedRelPaths) {
  if (!fs.existsSync(rootDir)) return false;
  let removed = false;

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        if (fs.readdirSync(abs).length === 0) {
          fs.rmdirSync(abs);
          removed = true;
        }
      } else {
        const rel = toPosix(path.relative(rootDir, abs));
        if (!expectedRelPaths.has(rel)) {
          fs.rmSync(abs, { force: true });
          removed = true;
        }
      }
    }
  };

  walk(rootDir);
  return removed;
}

function stripPrefix(relPath, prefix, label) {
  if (!relPath.startsWith(prefix)) {
    fail(`${label} path "${relPath}" is expected to start with "${prefix}"`);
  }
  return relPath.slice(prefix.length);
}

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  let changed = false;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (copyRecursive(srcPath, destPath)) changed = true;
    } else if (copyIfChanged(srcPath, destPath)) {
      changed = true;
    }
  }
  return changed;
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('⚠️  No dms-engine v3 manifest found at', MANIFEST_PATH);
    console.log('   Skipping v3 sync. Run `npm run build:v3` in dms-engine first.');
    process.exit(0);
  }

  const manifest = readJson(MANIFEST_PATH, 'v3 manifest');
  console.log(`📋 Syncing dms-engine v3 ${manifest.version} (built ${manifest.generatedAt})`);

  const diagrams = manifest.diagrams || [];
  const pathDocs = manifest.paths || [];
  const libraries = manifest.libraries || [];
  const puzzles = manifest.puzzles || [];
  const staticAssets = manifest.staticAssets || [];
  const sharedComponents = manifest.sharedComponents || [];

  // ---- Phase 1: verify every listed file exists and its hash is correct.
  // Nothing is copied until every check below has passed, so a bad manifest
  // never produces a partial sync.
  console.log('\n🔎 Verifying manifest contents...');
  const serverDiagramContents = new Map();
  for (const d of diagrams) {
    const serverAbs = path.join(ENGINE_DIST_V3, d.server);
    const publicAbs = path.join(ENGINE_DIST_V3, d.public);
    const content = verifyServerDiagram(serverAbs, `diagram "${d.id}" server file`);
    verifyPublicDiagram(publicAbs, `diagram "${d.id}" public file`, content.compiled.hash);
    serverDiagramContents.set(d.id, content);
  }
  for (const p of pathDocs) {
    verifySelfHashed(path.join(ENGINE_DIST_V3, p.public), `path "${p.id}"`);
  }
  for (const lib of libraries) {
    verifySelfHashed(path.join(ENGINE_DIST_V3, lib.public), `library "${lib.id}"`);
  }
  for (const puzzle of puzzles) {
    verifySelfHashed(path.join(ENGINE_DIST_V3, puzzle.server), `puzzle "${puzzle.id}"`);
  }
  if (manifest.catalog) assertExists(path.join(ENGINE_DIST_V3, manifest.catalog), 'catalog.json');
  for (const asset of staticAssets) {
    assertExists(path.join(ENGINE_DIST_V3, asset.source), `static asset "${asset.source}"`);
  }
  for (const comp of sharedComponents) {
    assertExists(path.join(ENGINE_DIST_V3, comp.source), `shared component "${comp.source}"`);
  }
  console.log('   ✅ All manifest files present with matching hashes');

  // ---- Phase 2: copy. `data/engine/` mirrors `public/*` (prefix stripped);
  // `server-data/engine/` mirrors `server/*` (prefix stripped).
  let changed = false;
  const expectedDataFiles = new Set();
  const expectedServerFiles = new Set();

  function syncDataFile(manifestRelPath, targetRelPath) {
    const src = path.join(ENGINE_DIST_V3, manifestRelPath);
    const dest = path.join(DATA_ENGINE_DIR, targetRelPath);
    expectedDataFiles.add(toPosix(targetRelPath));
    if (copyIfChanged(src, dest)) changed = true;
  }

  function syncServerFile(manifestRelPath, targetRelPath) {
    const src = path.join(ENGINE_DIST_V3, manifestRelPath);
    const dest = path.join(SERVER_DATA_ENGINE_DIR, targetRelPath);
    expectedServerFiles.add(toPosix(targetRelPath));
    if (copyIfChanged(src, dest)) changed = true;
  }

  console.log('\n📄 Syncing diagrams, paths, libraries and puzzles...');
  for (const d of diagrams) {
    syncDataFile(d.public, stripPrefix(d.public, 'public/', `diagram "${d.id}" public`));
    syncServerFile(d.server, stripPrefix(d.server, 'server/', `diagram "${d.id}" server`));
  }
  for (const p of pathDocs) {
    syncDataFile(p.public, stripPrefix(p.public, 'public/', `path "${p.id}"`));
  }
  for (const lib of libraries) {
    syncDataFile(lib.public, stripPrefix(lib.public, 'public/', `library "${lib.id}"`));
  }
  for (const puzzle of puzzles) {
    syncServerFile(puzzle.server, stripPrefix(puzzle.server, 'server/', `puzzle "${puzzle.id}"`));
  }

  console.log('📋 Syncing catalog and manifest...');
  if (manifest.catalog) syncDataFile(manifest.catalog, path.basename(manifest.catalog));
  syncDataFile('manifest.json', 'manifest.json');

  if (staticAssets.length > 0 || sharedComponents.length > 0) {
    console.log('🧩 Syncing static assets and shared components...');
    for (const asset of staticAssets) {
      const src = path.join(ENGINE_DIST_V3, asset.source);
      const dest = path.join(DIMENSYS_ROOT, asset.target);
      if (fs.statSync(src).isDirectory()) {
        if (copyRecursive(src, dest)) changed = true;
      } else if (copyIfChanged(src, dest)) {
        changed = true;
      }
    }
    for (const comp of sharedComponents) {
      const src = path.join(ENGINE_DIST_V3, comp.source);
      const dest = path.join(DIMENSYS_ROOT, comp.target);
      if (fs.statSync(src).isDirectory()) {
        if (copyRecursive(src, dest)) changed = true;
      } else if (copyIfChanged(src, dest)) {
        changed = true;
      }
    }
  }

  // ---- Phase 3: remove stale files from the two managed directories.
  console.log('\n🧹 Removing stale files...');
  if (removeStale(DATA_ENGINE_DIR, expectedDataFiles)) changed = true;
  if (removeStale(SERVER_DATA_ENGINE_DIR, expectedServerFiles)) changed = true;

  if (!changed) {
    console.log('   ℹ️  Everything already up to date');
  }

  console.log('\n✅ V3 sync complete!');
}

main();
