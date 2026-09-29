/**
 * Player state store (T3.1).
 *
 * A tiny external store, one instance per mounted player (never a module
 * singleton: the home hero, an embed and a full player can share a page, and
 * module state would leak between requests on the server). React reads it
 * through `useSyncExternalStore` (`usePlayerStore`); the particle canvas and
 * the worker bridge use `getState`/`subscribe` directly so the 10 Hz frames
 * never force React renders they don't need.
 *
 * Plain TypeScript, no React import: usable from tests, the bridge and rAF
 * loops alike. Same pattern as `ui/toastStore.ts`, scoped per instance.
 */
import type { Speed } from '../worker/protocol';
import type { PlayerBootstrap, UserAction } from '../types';

/** Player modes. Unsupported modes are hidden, not disabled. */
export type PlayerMode = 'explore' | 'break' | 'walkthrough' | 'build' | 'interview';

/** `group`: a framed group, selected from its frame's tab. */
export type Selection = { kind: 'node' | 'link' | 'group' | 'flow'; id: string } | null;

/** Latest columnar frame from the worker; arrays are owned by the store once received. */
export interface SimFrame {
  t: number;
  keysEpoch: number;
  metrics: Float64Array;
  health: Uint8Array;
}

export interface SimSlice {
  /** `unavailable` = no runtime bundle or no simulation: the static frame is the whole player. */
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
  playing: boolean;
  speed: Speed;
  keysEpoch: number;
  metricKeys: readonly string[];
  healthIds: readonly string[];
  frame: SimFrame | null;
  /** Increments on every frame; cheap equality key for selectors. */
  frameNo: number;
  /**
   * Latest pass/fail per watch id (T3.8), merged in from `FrameMsg.watches`
   * (`[id, pass]` pairs the worker re-evaluates every tick). Keyed by the
   * watch id a `NeedView.alarm` names — the requirement badges' one source
   * of truth. A watch id absent here hasn't reported yet (no badge state
   * flip until it does).
   */
  watches: Readonly<Record<string, boolean>>;
  errorCode?: string;
}

export interface StorySlice {
  scenarioId: string | null;
  runner: 'running' | 'paused-checkpoint' | 'paused-caption' | 'done' | null;
  duration: number | null;
}

export interface WalkthroughSlice {
  id: string | null;
  stepIndex: number;
}

export interface PlayerState {
  diagramId: string;
  revision: number;
  mode: PlayerMode;
  selection: Selection;
  sim: SimSlice;
  story: StorySlice;
  walkthrough: WalkthroughSlice;
  /** Canonical, worker-stamped action log: the share link's `a` param. */
  actions: readonly UserAction[];
}

export type PlayerStateUpdate = Partial<PlayerState> | ((state: PlayerState) => Partial<PlayerState>);

export interface PlayerStore {
  getState(): PlayerState;
  /** Shallow-merges the top-level keys; replace a slice wholesale to change it. */
  setState(update: PlayerStateUpdate): void;
  subscribe(listener: () => void): () => void;
}

export function initialPlayerState(bootstrap: Pick<PlayerBootstrap, 'diagramId' | 'revision' | 'hasSimulation' | 'runtimeUrl'>): PlayerState {
  return {
    diagramId: bootstrap.diagramId,
    revision: bootstrap.revision,
    // The player always opens in Explore, healthy.
    mode: 'explore',
    selection: null,
    sim: {
      status: bootstrap.hasSimulation && bootstrap.runtimeUrl ? 'idle' : 'unavailable',
      playing: false,
      speed: 1,
      keysEpoch: 0,
      metricKeys: [],
      healthIds: [],
      frame: null,
      frameNo: 0,
      watches: {},
    },
    story: { scenarioId: null, runner: null, duration: null },
    walkthrough: { id: null, stepIndex: 0 },
    actions: [],
  };
}

export function createPlayerStore(initial: PlayerState): PlayerStore {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState(update) {
      const patch = typeof update === 'function' ? update(state) : update;
      const next = { ...state, ...patch };
      // Skip the notify when nothing changed by identity.
      if ((Object.keys(patch) as (keyof PlayerState)[]).every((k) => next[k] === state[k])) return;
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
