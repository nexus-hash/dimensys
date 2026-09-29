/**
 * Walkthrough state transitions over the shared player store's
 * `walkthrough` slice (`{ id, stepIndex }`). Plain functions, no React:
 * the rail, the narration dock, the keyboard handler and the deep-link
 * reader all go through these, so the rules (clamping, entering the mode,
 * exiting cleanly) live in one place.
 */
import type { PlayerStore } from '../store/playerStore';

interface Sized {
  id: string;
  steps: readonly unknown[];
}

/** Enters Walkthrough mode on `id` at `stepIndex` (clamped). */
export function openWalkthrough(store: PlayerStore, walkthroughs: readonly Sized[], id: string, stepIndex = 0): void {
  const wt = walkthroughs.find((w) => w.id === id);
  if (!wt || wt.steps.length === 0) return;
  const index = Math.min(Math.max(0, stepIndex), wt.steps.length - 1);
  const cur = store.getState();
  if (cur.mode === 'walkthrough' && cur.walkthrough.id === id && cur.walkthrough.stepIndex === index) return;
  store.setState({ mode: 'walkthrough', walkthrough: { id, stepIndex: index } });
}

/** Moves by `delta` steps within the active walkthrough; no-op at either end. */
export function stepBy(store: PlayerStore, walkthroughs: readonly Sized[], delta: number): void {
  const { walkthrough } = store.getState();
  const wt = walkthroughs.find((w) => w.id === walkthrough.id);
  if (!wt) return;
  const next = Math.min(Math.max(0, walkthrough.stepIndex + delta), wt.steps.length - 1);
  if (next === walkthrough.stepIndex) return;
  store.setState({ walkthrough: { id: wt.id, stepIndex: next } });
}

/** Leaves the walkthrough: back to Explore, nothing selected in the slice. */
export function exitWalkthrough(store: PlayerStore): void {
  store.setState({ mode: 'explore', walkthrough: { id: null, stepIndex: 0 } });
}
