/**
 * Bridge registry (T3.8).
 *
 * `InteractiveLayer` (T3.3, owned by FID2 — out of scope here) creates and
 * owns the one `WorkerBridge` per mounted player as a plain local variable
 * inside its own mount effect; nothing else ever saw the instance. The HUD
 * and timeline dock (this task) need to send `play`/`pause`/`setSpeed`/
 * `seek` without either duplicating that bridge (a second worker fighting
 * the first over `store.setState`) or reaching into `InteractiveLayer`'s
 * internals.
 *
 * This is the seam: a `WeakMap` keyed by the `PlayerStore` instance itself
 * (one store per mounted player, see `playerStore.ts`), so any component
 * holding that store's reference can look up its bridge — or find none yet
 * (still loading, or the browser has no simulation) and no-op. Not
 * reactive on purpose: `WorkerBridge`'s constructor registers itself
 * synchronously before any message (and so before `sim.status` can ever
 * read `'ready'`), so a command handler that checks `sim.status === 'ready'`
 * before calling `getBridge` never races an unregistered entry.
 */
import type { PlayerStore } from '../store/playerStore';
import type { WorkerBridge } from './bridge';

const registry = new WeakMap<PlayerStore, WorkerBridge>();

/** Called once from `WorkerBridge`'s constructor. */
export function registerBridge(store: PlayerStore, bridge: WorkerBridge): void {
  registry.set(store, bridge);
}

/** Called once from `WorkerBridge.dispose()`; a no-op if a newer bridge (a restart) already replaced this one. */
export function unregisterBridge(store: PlayerStore, bridge: WorkerBridge): void {
  if (registry.get(store) === bridge) registry.delete(store);
}

/** The live bridge for this player's store, or `undefined` before it exists / after it's disposed. */
export function getBridge(store: PlayerStore): WorkerBridge | undefined {
  return registry.get(store);
}
