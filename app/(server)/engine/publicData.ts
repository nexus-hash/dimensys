import 'server-only';

import type { ViewData } from '@/app/(components)/player/types';

/**
 * Reader for the PUBLIC view-data output, synced by T2.5 into `data/engine/`.
 *
 * Read only at build time from Server Components (`/solutions/[id]` is fully
 * prerendered via `generateStaticParams`, `dynamicParams = false`), plus the
 * force-static JSON route the worker fetches. IDs are only ever looked up in
 * the manifest list, never joined into a path unchecked.
 *
 * Skeleton (T3.1): typed stubs, no behaviour. Implemented in T3.13.
 */

/** Relative to the app root (`process.cwd()` during `next build`). */
export const ENGINE_DATA_DIR = 'data/engine';

/** Every diagram ID with a synced public file (from `data/engine/manifest.json`). */
export async function listDiagramIds(): Promise<string[]> {
  // TODO(T3.13): read manifest.diagrams[].id.
  return [];
}

/** Maps a former ID (catalog aliases) to its canonical ID, or `null`. Used by next.config `redirects()`. */
export async function resolveAlias(id: string): Promise<string | null> {
  void id;
  // TODO(T3.13): build the alias map from catalog.json entries[].aliases.
  return null;
}

/** The player's slice of `public/diagrams/<id>.json`, or `null` when the ID is unknown. */
export async function loadPlayerDiagram(id: string): Promise<ViewData | null> {
  void id;
  // TODO(T3.13): fs read + JSON.parse, wrapped in React `cache()`; check VIEW_DATA_MAJOR.
  return null;
}

/** Hashed URL of the prebuilt worker bundle (manifest `staticAssets`), or `null`. */
export async function loadRuntimeUrl(): Promise<string | null> {
  // TODO(T2.13/T3.13): read from the synced manifest once the runtime bundle is emitted.
  return null;
}
