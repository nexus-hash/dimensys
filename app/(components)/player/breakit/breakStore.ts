'use client';

/**
 * Break It's own UI state, one small store per mounted player: which tool
 * is armed, whether the Fix it panel is open (and which right-panel tab is
 * showing), the spike popover, and each applied fix's "before" reading.
 *
 * Kept out of the shared player store on purpose: none of this is part of
 * the simulation or the share link (the canonical action log already lives
 * there, as `actions`), and a separate store keyed by the player store
 * instance lets the toolbox, the board targeting, the Fix it panel and the
 * phone sheet share it without threading a provider through the shell.
 */
import { useSyncExternalStore } from 'react';
import type { PlayerStore } from '../store/playerStore';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { BreakTool } from './tools';

/** The global readings a fix is judged by: p99, error rate, throughput, cost. */
export interface MetricSnapshot {
  e?: number;
  f?: number;
  q?: number;
  m?: number;
}

export interface FixMark {
  /** Simulated second the fix went in. */
  t: number;
  before: MetricSnapshot;
}

export interface BreakUiState {
  armed: BreakTool | null;
  /** The Fix it panel is open (desktop/tablet right column; the phone sheet's Fix it tab). */
  drawer: boolean;
  /** Right-panel tab while the Fix it panel is open. */
  tab: 'inspect' | 'fix';
  spikeOpen: boolean;
  /** Fix id → reading taken the moment it was applied. */
  marks: Readonly<Record<string, FixMark>>;
  /** The panel has opened itself once this session (it only does that once). */
  autoOpened: boolean;
}

export interface BreakUiStore {
  get(): BreakUiState;
  set(patch: Partial<BreakUiState> | ((s: BreakUiState) => Partial<BreakUiState>)): void;
  subscribe(listener: () => void): () => void;
}

export function initialBreakUi(): BreakUiState {
  return { armed: null, drawer: false, tab: 'fix', spikeOpen: false, marks: {}, autoOpened: false };
}

export function createBreakUiStore(initial: BreakUiState = initialBreakUi()): BreakUiStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...p };
      if ((Object.keys(p) as (keyof BreakUiState)[]).every((k) => next[k] === state[k])) return;
      state = next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const stores = new WeakMap<PlayerStore, BreakUiStore>();

/** This player's Break It UI store, created on first use. */
export function breakUiFor(player: PlayerStore): BreakUiStore {
  let s = stores.get(player);
  if (!s) {
    s = createBreakUiStore();
    stores.set(player, s);
  }
  return s;
}

export function useBreakUiApi(): BreakUiStore {
  return breakUiFor(usePlayerStoreApi());
}

/** Subscribes to one derived value (a primitive or a slice the store replaces on change). */
export function useBreakUi<T>(selector: (s: BreakUiState) => T): T {
  const api = useBreakUiApi();
  const get = () => selector(api.get());
  return useSyncExternalStore(api.subscribe, get, get);
}
