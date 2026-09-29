/**
 * A rebuilt run's lead-up (a share link opened on a fresh page): the global
 * metrics' readings after the run's first tick and over its last 60 s, as
 * the worker reports them once the rebuild is ready. The HUD seeds its
 * "versus the start" reference and its sparklines from it, so a shared
 * moment reads the same as it did for the person who shared it.
 */
import type { PlayerStore } from '../store/playerStore';

export interface LeadUp {
  /** Global metric keys (`g.<code>`). */
  keys: readonly string[];
  /** Readings after the first tick, per key. */
  first: readonly number[];
  t: readonly number[];
  /** `series[i]` follows `keys[i]` over `t`. */
  series: readonly (readonly number[])[];
}

const pending = new WeakMap<PlayerStore, LeadUp>();

export function setLeadUp(store: PlayerStore, leadUp: LeadUp | null): void {
  if (leadUp) pending.set(store, leadUp);
  else pending.delete(store);
}

/** The pending lead-up, handed over once. */
export function takeLeadUp(store: PlayerStore): LeadUp | null {
  const l = pending.get(store) ?? null;
  pending.delete(store);
  return l;
}
