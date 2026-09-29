/**
 * Scenario runner events.
 *
 * Every `frame` carries the runner events emitted since the previous one
 * (captions, checkpoints, choices, triggers, the end). They're addressed to
 * the story UI, not to the shared player state, so they travel on this small
 * side channel: a set of listeners per `PlayerStore` (the same key
 * `bridgeRegistry.ts` and `calcResults.ts` use). The bridge publishes; the
 * story controller subscribes while it is mounted.
 */
import type { PlayerStore } from '../store/playerStore';
import type { RunnerEventLike } from '../types';

type Listener = (events: readonly RunnerEventLike[]) => void;

const listeners = new WeakMap<PlayerStore, Set<Listener>>();

/** Subscribes to this player's runner events; returns the unsubscribe. */
export function onRunnerEvents(store: PlayerStore, listener: Listener): () => void {
  let set = listeners.get(store);
  if (!set) {
    set = new Set();
    listeners.set(store, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

/** Called by the bridge with each frame's events, in order. */
export function publishRunnerEvents(store: PlayerStore, events: readonly RunnerEventLike[]): void {
  if (events.length === 0) return;
  const set = listeners.get(store);
  if (!set) return;
  for (const l of [...set]) l(events);
}
