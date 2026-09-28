/**
 * The walkthrough's slice of the share URL: `?v=<walkthrough id>&st=<step id>`.
 * Kept small and isolated on purpose, so the full share-state encoder can
 * absorb it later without untangling it from the player. `st` also accepts
 * a 1-based step number (`&st=3`), which is handy to type by hand.
 */

export const VIEW_PARAM = 'v';
export const STEP_PARAM = 'st';

export interface WalkthroughRef {
  id: string;
  stepIndex: number;
}

interface Resolvable {
  id: string;
  steps: ReadonlyArray<{ id: string }>;
}

/** Resolves `v`/`st` against the diagram's walkthroughs; `null` when `v` isn't one of them. */
export function readWalkthroughParams(search: string | URLSearchParams, walkthroughs: readonly Resolvable[]): WalkthroughRef | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const id = params.get(VIEW_PARAM);
  if (!id) return null;
  const wt = walkthroughs.find((w) => w.id === id);
  if (!wt || wt.steps.length === 0) return null;
  const st = params.get(STEP_PARAM);
  if (!st) return { id, stepIndex: 0 };
  const byId = wt.steps.findIndex((s) => s.id === st);
  if (byId >= 0) return { id, stepIndex: byId };
  if (/^\d+$/.test(st)) {
    const n = Number(st);
    return { id, stepIndex: Math.min(Math.max(n, 1), wt.steps.length) - 1 };
  }
  return { id, stepIndex: 0 };
}

/**
 * The query string with the walkthrough params set (or removed, for
 * `null`), every other param left as it was. Returns the `?…` part, or `''`
 * when nothing is left.
 */
export function writeWalkthroughParams(search: string, ref: { id: string; stepId: string } | null): string {
  const params = new URLSearchParams(search);
  if (ref) {
    params.set(VIEW_PARAM, ref.id);
    params.set(STEP_PARAM, ref.stepId);
  } else {
    params.delete(VIEW_PARAM);
    params.delete(STEP_PARAM);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

/** A link that opens `diagramId`'s player straight on a walkthrough (and optionally a step). */
export function walkthroughHref(diagramId: string, walkthroughId: string, stepId?: string): string {
  const params = new URLSearchParams({ [VIEW_PARAM]: walkthroughId });
  if (stepId) params.set(STEP_PARAM, stepId);
  return `/solutions/${encodeURIComponent(diagramId)}?${params.toString()}`;
}
