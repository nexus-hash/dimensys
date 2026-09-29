/**
 * Calculator replies (T3.7).
 *
 * A `calc` command is answered by one `calcResult` (or, when the worker
 * rejects it, one non-fatal `error` carrying the same `seq`). Those replies
 * are addressed to whichever component sent the command — the inspector's
 * sizing calculator — not to the shared player state, so they travel on
 * this small side channel instead of a store slice: a set of listeners per
 * `PlayerStore` (one store per mounted player, the same key
 * `bridgeRegistry.ts` uses). The bridge publishes; a calculator subscribes
 * while it is mounted and matches replies to its own `seq`.
 */
import type { PlayerStore } from '../store/playerStore';

export interface CalcReply {
  seq: number;
  /** Calculator id; absent on an error reply. */
  id?: string;
  /** Output values keyed by output id; absent on an error reply. */
  outputs?: { readonly [outputId: string]: number };
  /** Set when the worker rejected the command. */
  error?: string;
}

type Listener = (reply: CalcReply) => void;

const listeners = new WeakMap<PlayerStore, Set<Listener>>();

/** Subscribes to every calculator reply for this player; returns the unsubscribe. */
export function onCalcReply(store: PlayerStore, listener: Listener): () => void {
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

/** Called by the bridge for each `calcResult`, and for each non-fatal `error` whose `seq` answers a command. */
export function publishCalcReply(store: PlayerStore, reply: CalcReply): void {
  const set = listeners.get(store);
  if (!set) return;
  for (const l of [...set]) l(reply);
}
