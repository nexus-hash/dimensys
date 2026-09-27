import 'server-only';

import { cache } from 'react';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RUNTIME_FORMAT } from '@/app/(components)/player/types';
import type { CatalogView, RuntimeManifest, ViewData } from '@/app/(components)/player/types';

/**
 * Reader for the PUBLIC view-data output, synced by `sync-engine-v3.js` into
 * `data/engine/`.
 *
 * Read only at build time from Server Components (`/solutions/[id]` is fully
 * prerendered via `generateStaticParams`, `dynamicParams = false`), plus the
 * force-static JSON route the worker fetches. IDs are only ever looked up in
 * the manifest list, never joined into a path unchecked.
 */

/** Relative to the app root (`process.cwd()` during `next build`). */
export const ENGINE_DATA_DIR = 'data/engine';

function dataPath(...segments: string[]): string {
  return path.join(process.cwd(), ENGINE_DATA_DIR, ...segments);
}

/** Thrown when a synced file declares a `runtimeFormat`/`fmt` this app wasn't built for. */
class UnsupportedRuntimeFormatError extends Error {
  constructor(label: string, found: number) {
    super(`${label} has runtimeFormat/fmt ${found}, this app only supports ${RUNTIME_FORMAT}`);
    this.name = 'UnsupportedRuntimeFormatError';
  }
}

function checkFormat(label: string, fmt: number): void {
  if (fmt !== RUNTIME_FORMAT) throw new UnsupportedRuntimeFormatError(label, fmt);
}

async function readJson<T>(absPath: string): Promise<T> {
  const raw = await fs.readFile(absPath, 'utf-8');
  return JSON.parse(raw) as T;
}

/** `data/engine/manifest.json`, cached for the lifetime of the request/build. */
export const loadManifest = cache(async (): Promise<RuntimeManifest> => {
  const manifest = await readJson<RuntimeManifest>(dataPath('manifest.json'));
  checkFormat('manifest.json', manifest.runtimeFormat);
  return manifest;
});

/** `data/engine/catalog.json`, cached. */
export const loadCatalog = cache(async (): Promise<CatalogView> => {
  const catalog = await readJson<CatalogView>(dataPath('catalog.json'));
  checkFormat('catalog.json', catalog.fmt);
  return catalog;
});

/** Every diagram ID with a synced public file (from `manifest.diagrams[].id`). */
export async function listDiagramIds(): Promise<string[]> {
  const manifest = await loadManifest();
  return manifest.diagrams.map((d) => d.id);
}

/** The player's view-data document for one diagram, or `null` when the ID is unknown or unsynced. */
export const loadPlayerDiagram = cache(async (id: string): Promise<ViewData | null> => {
  const manifest = await loadManifest();
  if (!manifest.diagrams.some((d) => d.id === id)) return null;
  let view: ViewData;
  try {
    view = await readJson<ViewData>(dataPath('diagrams', `${id}.view.json`));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  checkFormat(`diagrams/${id}.view.json`, view.fmt);
  return view;
});

/** Where a diagram's sim payload lives on disk, plus the build hash it must match. `null` when the diagram has no simulation. */
export interface SimPayloadRef {
  /** Path relative to `ENGINE_DATA_DIR`, POSIX — not a served URL. The worker's fetch route is T2.13's concern. */
  dataPath: string;
  build: string;
}

export const loadSimPayloadRef = cache(async (id: string): Promise<SimPayloadRef | null> => {
  const manifest = await loadManifest();
  const entry = manifest.diagrams.find((d) => d.id === id);
  if (!entry || !entry.sim) return null;
  const rel = entry.sim.path.startsWith('public/') ? entry.sim.path.slice('public/'.length) : entry.sim.path;
  return { dataPath: rel, build: entry.build };
});

/** A `public`-scope manifest file entry whose path looks like the hashed worker bundle. */
const RUNTIME_BUNDLE_RE = /^public\/runtime\/(sim-worker\..*\.js)$/;

/**
 * Hashed URL of the prebuilt worker bundle, or `null` when the synced
 * manifest doesn't list one (an engine build predating T2.13, or a
 * diagram-less build). Built from the manifest's own `files[]` (scope
 * `public`) rather than a dedicated manifest field, so this works against
 * any manifest 3.1 build regardless of whether it also stamps the optional
 * `runtime` pointer.
 *
 * The path is `/engine/runtime/<filename>?h=<hash8>` — see
 * `PlayerBootstrap.runtimeUrl`. No route serves that path yet (T3.13); the
 * dev-only worker page (T2.13) serves the same synced bytes through its own
 * dev-gated route instead of this one.
 */
export async function loadRuntimeUrl(): Promise<string | null> {
  const manifest = await loadManifest();
  const entry = manifest.files.find((f) => f.scope === 'public' && RUNTIME_BUNDLE_RE.test(f.path));
  if (!entry) return null;
  const match = RUNTIME_BUNDLE_RE.exec(entry.path)!;
  const shortHash = entry.hash.replace(/^sha256:/, '').slice(0, 8);
  return `/engine/runtime/${match[1]}?h=${shortHash}`;
}

/**
 * Every known runtime worker bundle filename in the synced manifest (usually
 * zero or one). Used by the production route (T3.13, `app/engine/runtime/`)
 * both to enumerate `generateStaticParams` and to validate an incoming
 * filename against the manifest before reading it off disk — never trust
 * the requested path alone.
 */
export async function listRuntimeBundleFilenames(): Promise<string[]> {
  const manifest = await loadManifest();
  return manifest.files
    .filter((f): f is typeof f & { path: string } => f.scope === 'public' && RUNTIME_BUNDLE_RE.test(f.path))
    .map((f) => RUNTIME_BUNDLE_RE.exec(f.path)![1]);
}

// ---------------------------------------------------------------------------
// Concepts: the CS-curriculum content `app/concepts/**` renders. Synced
// (like everything above) into `data/engine/concepts/`, byte-for-byte from
// the engine's `src/assets/data/concepts/`. Read server-side only, at
// build/render time — never fetched raw by the browser.
// ---------------------------------------------------------------------------

interface ConceptsCategoryEntry {
  id: string;
  title: string;
  description?: string;
  file: string;
}

export interface ConceptsIndex {
  categories: ConceptsCategoryEntry[];
}

interface ConceptEntry {
  id: string;
  title: string;
  readTime: string;
  tags: string[];
  contentFile?: string;
}

interface ConceptModule {
  id: string;
  title: string;
  concepts: ConceptEntry[];
}

export interface ConceptsCategoryData {
  modules: ConceptModule[];
}

/** `data/engine/concepts/index.json` — the list of concept categories. Cached. */
export const loadConceptsIndex = cache(async (): Promise<ConceptsIndex> => {
  return readJson<ConceptsIndex>(dataPath('concepts', 'index.json'));
});

/** One category's modules (`data/engine/concepts/<categoryId>.json`, e.g. `hld.json`). Cached per category. */
export const loadConceptsCategory = cache(async (categoryId: string): Promise<ConceptsCategoryData> => {
  return readJson<ConceptsCategoryData>(dataPath('concepts', `${categoryId}.json`));
});

/**
 * One concept article's raw Markdown (`data/engine/concepts/content/<contentFile>`).
 * `contentFile` must be a value already present in a synced category JSON
 * (`ConceptEntry.contentFile`) — never taken from an unvalidated request
 * path. Both static routes that call this (`/concepts` detail page) enumerate
 * every valid pair via `generateStaticParams` with `dynamicParams = false`,
 * so no runtime `fs` access happens for an id that isn't already known.
 */
export async function loadConceptContent(contentFile: string): Promise<string> {
  return fs.readFile(dataPath('concepts', 'content', contentFile), 'utf-8');
}
