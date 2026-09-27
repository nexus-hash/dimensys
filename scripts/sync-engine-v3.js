#!/usr/bin/env node

/**
 * sync-engine-v3.js — Manifest-driven sync tool for the engine's v3 build
 * output (manifest version 3.1).
 *
 * Reads the engine's `manifest.json`, which lists every output file under a
 * flat `files[]` array: `{ path, hash: "sha256:<hex>", bytes, scope: "public"
 * | "server" }`. For every listed file this script:
 *
 *   1. Verifies (before copying anything) that the file exists on disk and
 *      that its size and sha256 hash match what the manifest says.
 *   2. Copies it by `scope`:
 *        - `public` → `data/engine/` (the file's path with its leading
 *          `public/` segment stripped).
 *        - `server` → `server-data/engine/` (its leading `server/` segment
 *          stripped).
 *      A file whose declared `scope` doesn't match its own path prefix (e.g.
 *      scope `public` on a `server/...` path) fails verification rather than
 *      being silently miscopied.
 *
 * Files are copied as raw bytes — nothing is parsed or reinterpreted. This
 * is deliberate: some are opaque binary payloads (`*.sim.bin`), and even the
 * JSON ones are only ever treated as bytes here, never inspected. All this
 * script needs to know is the manifest's own file list.
 *
 * The manifest also carries a `runtimeFormat` integer. This app supports
 * exactly one format; a manifest built for any other format fails the sync
 * loudly instead of producing output the app can't read correctly.
 *
 * `manifest.json` itself isn't one of the listed `files[]` entries (it's the
 * thing that lists them), so it's copied separately, unconditionally, into
 * `data/engine/manifest.json` — the app reads it from there.
 *
 * The sync is idempotent (a file already identical to its source is left
 * alone — mtime included) and removes files that are no longer listed in the
 * manifest from the two managed directories.
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

/**
 * The one runtime format this app understands. Must match `RUNTIME_FORMAT`
 * in `app/(components)/player/types.ts` — the two live in separate files
 * (this is a plain Node script, that's a TypeScript module the app imports)
 * but describe the same contract, so keep them in lockstep by hand.
 */
const SUPPORTED_RUNTIME_FORMAT = 2;

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

// --- hashing -----------------------------------------------------------

/** `sha256:<hex>` of a file's raw bytes. Never parses the file. */
function fileHashEntry(absPath) {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
  return `sha256:${digest}`;
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

function stripPrefix(relPath, prefix, label) {
  if (!relPath.startsWith(prefix)) {
    fail(`${label} path "${relPath}" is expected to start with "${prefix}" for scope "${prefix.replace('/', '')}"`);
  }
  return relPath.slice(prefix.length);
}

/** Verifies one `files[]` entry exists with the exact size and hash the manifest declares. Never parses it. */
function verifyFileEntry(absPath, entry, label) {
  assertExists(absPath, label);
  const stat = fs.statSync(absPath);
  if (typeof entry.bytes !== 'number' || stat.size !== entry.bytes) {
    fail(`${label} size mismatch: manifest says ${entry.bytes} bytes, file is ${stat.size} bytes (${absPath})`);
  }
  const hash = fileHashEntry(absPath);
  if (typeof entry.hash !== 'string' || hash !== entry.hash) {
    fail(`${label} hash mismatch: manifest says ${entry.hash}, file hashes to ${hash} (${absPath})`);
  }
}

/** Resolves the `data/engine` or `server-data/engine` target for one manifest `files[]` entry, by its declared scope. */
function targetForEntry(entry) {
  const label = `file "${entry.path}"`;
  if (entry.scope === 'public') {
    return { dir: DATA_ENGINE_DIR, rel: stripPrefix(entry.path, 'public/', label) };
  }
  if (entry.scope === 'server') {
    return { dir: SERVER_DATA_ENGINE_DIR, rel: stripPrefix(entry.path, 'server/', label) };
  }
  fail(`${label} has an unknown scope: ${JSON.stringify(entry.scope)} (expected "public" or "server")`);
  return undefined;
}

// --- copying ---------------------------------------------------------------

/** Copies `srcAbs` to `destAbs` only if the bytes differ (idempotent; preserves mtime otherwise). Raw bytes only — never parses. */
function copyIfChanged(srcAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  if (fs.existsSync(destAbs) && fileHashEntry(srcAbs) === fileHashEntry(destAbs)) {
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

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('⚠️  No dms-engine v3 manifest found at', MANIFEST_PATH);
    console.log('   Skipping v3 sync. Run `npm run build:v3` in dms-engine first.');
    process.exit(0);
  }

  const manifest = readJson(MANIFEST_PATH, 'v3 manifest');
  console.log(`📋 Syncing dms-engine v3 ${manifest.version} (built ${manifest.generatedAt})`);

  if (manifest.runtimeFormat !== SUPPORTED_RUNTIME_FORMAT) {
    fail(
      `manifest.json declares runtimeFormat ${JSON.stringify(manifest.runtimeFormat)}, ` +
        `this app only supports runtimeFormat ${SUPPORTED_RUNTIME_FORMAT}. Rebuild the app against a matching engine build.`,
    );
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];

  // ---- Phase 1: verify every listed file exists with the exact size and
  // hash the manifest declares. Nothing is copied until every check below
  // has passed, so a bad manifest never produces a partial sync.
  console.log('\n🔎 Verifying manifest file list...');
  const targets = [];
  for (const entry of files) {
    const absPath = path.join(ENGINE_DIST_V3, entry.path);
    verifyFileEntry(absPath, entry, `file "${entry.path}"`);
    targets.push({ entry, absPath, target: targetForEntry(entry) });
  }
  console.log(`   ✅ All ${files.length} manifest file(s) present with matching size and hash`);

  // ---- Phase 2: copy. Raw bytes only, per `scope`.
  let changed = false;
  const expectedDataFiles = new Set();
  const expectedServerFiles = new Set();

  for (const { absPath, target } of targets) {
    const destAbs = path.join(target.dir, target.rel);
    if (copyIfChanged(absPath, destAbs)) changed = true;
    if (target.dir === DATA_ENGINE_DIR) expectedDataFiles.add(toPosix(target.rel));
    else expectedServerFiles.add(toPosix(target.rel));
  }

  // `manifest.json` isn't itself a `files[]` entry (it's the list), so it's
  // copied unconditionally alongside the public data it describes.
  console.log('📋 Syncing manifest...');
  const manifestDest = path.join(DATA_ENGINE_DIR, 'manifest.json');
  if (copyIfChanged(MANIFEST_PATH, manifestDest)) changed = true;
  expectedDataFiles.add('manifest.json');

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
