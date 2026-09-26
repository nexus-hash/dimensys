#!/usr/bin/env node

/**
 * check-public-boundary.mjs — guardrail keeping the private engine's spec
 * and architecture internals out of this (public) repo.
 *
 * This app must only ever know a neutral view-data shape and the worker
 * message protocol — never the private engine's own authoring schema, type
 * names, section-numbered spec documents, or internal doc paths. This
 * script fails the build if any tracked file contains one of a small set of
 * forbidden strings that would indicate that boundary was crossed:
 *
 *   - SCHEMA_V3           (the private engine's authoring schema name)
 *   - src/types/v3        (the private engine's authoring type module path)
 *   - CompiledDiagram     (a private engine type name)
 *   - DiagramBody         (a private engine type name)
 *   - UI_UX_SPEC          (the private UI spec document)
 *   - TASK_PLAN           (a private planning document)
 *   - dms-engine/src      (a path into the private engine's source tree)
 *   - docs/app/           (the private engine repo's doc index — app docs
 *                          were moved there and must not be linked back to)
 *   - §<digit>            (a section reference into a private spec doc)
 *
 * Usage: node scripts/check-public-boundary.mjs   (npm run lint:boundary)
 *
 * Allowlist: some tracked files legitimately need to reference one of these
 * strings as data, not as a spec leak (e.g. a CI guard whose job is to grep
 * *for* "dms-engine/src" in a build artifact). Such lines can be listed,
 * with a justification, in scripts/check-public-boundary.allowlist.json —
 * keep that file empty or as small as possible.
 */

import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const SELF = relative(ROOT, fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = join(__dirname, 'check-public-boundary.allowlist.json');
const ALLOWLIST_REL = relative(ROOT, ALLOWLIST_PATH);

// Binary/large-asset extensions we never need to scan.
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2',
  '.ttf', '.otf', '.eot', '.mp4', '.webm', '.mp3', '.pdf', '.zip',
]);

const PATTERNS = [
  { name: 'SCHEMA_V3', re: /SCHEMA_V3/ },
  { name: 'src/types/v3', re: /src\/types\/v3/ },
  { name: 'CompiledDiagram', re: /CompiledDiagram/ },
  { name: 'DiagramBody', re: /DiagramBody/ },
  { name: 'UI_UX_SPEC', re: /UI_UX_SPEC/ },
  { name: 'TASK_PLAN', re: /TASK_PLAN/ },
  { name: 'dms-engine/src', re: /dms-engine\/src/ },
  { name: 'docs/app/', re: /docs\/app\// },
  { name: '§<digit>', re: /§\d/ },
];

function loadAllowlist() {
  try {
    const raw = readFileSync(ALLOWLIST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.allow)) return [];
    return parsed.allow;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function listTrackedFiles() {
  const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function isSkippable(file) {
  const dot = file.lastIndexOf('.');
  if (dot === -1) return false;
  return SKIP_EXTENSIONS.has(file.slice(dot).toLowerCase());
}

function main() {
  const allowlist = loadAllowlist();
  const allowed = new Map(); // file -> Set(pattern names allowed for that file)
  for (const entry of allowlist) {
    if (!entry.file || !entry.pattern) continue;
    if (!allowed.has(entry.file)) allowed.set(entry.file, new Set());
    allowed.get(entry.file).add(entry.pattern);
  }

  const files = listTrackedFiles().filter((f) => f !== SELF && f !== ALLOWLIST_REL && !isSkippable(f));

  const violations = [];

  for (const file of files) {
    const full = join(ROOT, file);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue; // deleted-but-still-listed (rare race), skip
    }
    if (!stat.isFile()) continue;

    let content;
    try {
      content = readFileSync(full, 'utf8');
    } catch {
      continue; // not readable as text (e.g. binary without a known extension)
    }
    // Skip files that don't decode cleanly as text (binary heuristic).
    if (content.includes('\u0000')) continue;

    const lines = content.split('\n');
    for (const { name, re } of PATTERNS) {
      const fileAllowed = allowed.get(file);
      if (fileAllowed && fileAllowed.has(name)) continue;
      lines.forEach((line, idx) => {
        if (re.test(line)) {
          violations.push({ file, line: idx + 1, pattern: name, text: line.trim() });
        }
      });
    }
  }

  if (violations.length > 0) {
    console.error(`\n${violations.length} public-boundary violation(s):\n`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.pattern}]  ${v.text}`);
    }
    console.error(
      '\nThese strings must not appear in the public app repo. If a match is a ' +
        'justified exception (e.g. a CI guard checking build output for a leaked ' +
        `path), add it to ${ALLOWLIST_REL} with a comment explaining why.`
    );
    process.exit(1);
  }

  console.log('check-public-boundary: OK');
}

main();
