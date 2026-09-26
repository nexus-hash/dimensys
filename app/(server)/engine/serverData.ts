import 'server-only';

/**
 * Reader for the engine's SERVER-ONLY output, synced by T2.5 into
 * `server-data/engine/` (never under `public/`): full diagram sources with
 * `interview` blocks, and puzzles with their secrets
 * (docs/PLAYER_ARCHITECTURE.md §4, DETAILED_PLAN §3.3 IP note).
 *
 * Import this ONLY from Route Handlers (`app/api/**\/route.ts`) or other
 * server-only modules that return derived answers (a grade, a hint, today's
 * public puzzle half), never raw documents. Never from a page or layout: a
 * Server Component's props end up in the RSC payload.
 *
 * Skeleton (T3.1): typed stubs, no behaviour. Implemented with the Daily
 * Outage / interview route handlers.
 */

/** Relative to the app root; traced into the functions that read it via `outputFileTracingIncludes`. */
export const SERVER_DATA_DIR = 'server-data/engine';

/** Opaque here on purpose: callers get derived results, not the document. */
export type ServerDocument = { readonly __serverOnly: true };

export async function loadServerDiagram(id: string): Promise<ServerDocument | null> {
  void id;
  return null;
}

export async function loadPuzzle(id: string): Promise<ServerDocument | null> {
  void id;
  return null;
}
