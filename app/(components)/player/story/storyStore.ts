'use client';

/**
 * The scenario UI's own state, one small store per mounted player, fed by
 * the runner events each frame carries (`worker/runnerEvents.ts`): the
 * rendered text of every caption that fired, the triggers that fired, the
 * checkpoint the run is paused at and the answer given at each checkpoint.
 *
 * Kept out of the shared player store (like Break it's): none of it is part
 * of the simulation or the share link, and the shared store already holds
 * the scenario id, the runner status and the length (`story`).
 */
import { useSyncExternalStore } from 'react';
import type { PlayerStore } from '../store/playerStore';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { RunnerEventLike } from '../types';

export interface TriggerNote {
  id: string;
  /** Simulated second it fired. */
  at: number;
  text: string;
  aim?: string;
}

export interface Answer {
  /** `null`: the checkpoint was passed with "Keep watching". */
  choiceId: string | null;
  /** Simulated second it was answered. */
  at: number;
}

export interface StoryUiState {
  /** Rendered caption text (live values filled in), keyed by the caption's start second. */
  rendered: Readonly<Record<string, string>>;
  triggers: readonly TriggerNote[];
  /** The checkpoint the run is paused at, per the runner. */
  pending: string | null;
  /** Answers by checkpoint id. */
  answers: Readonly<Record<string, Answer>>;
  ended: boolean;
}

export interface StoryUiStore {
  get(): StoryUiState;
  set(patch: Partial<StoryUiState> | ((s: StoryUiState) => Partial<StoryUiState>)): void;
  subscribe(listener: () => void): () => void;
}

export function initialStoryUi(): StoryUiState {
  return { rendered: {}, triggers: [], pending: null, answers: {}, ended: false };
}

export function createStoryUiStore(initial: StoryUiState = initialStoryUi()): StoryUiStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...p };
      if ((Object.keys(p) as (keyof StoryUiState)[]).every((k) => next[k] === state[k])) return;
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

/** Caption key: its start second, as the view and the runner both give it. */
export const captionKey = (t: number) => String(Math.round(t * 1000) / 1000);

/** Folds one frame's runner events into the story state. Pure. */
export function reduceRunnerEvents(state: StoryUiState, events: readonly RunnerEventLike[]): StoryUiState {
  let s = state;
  for (const e of events) {
    switch (e.kind) {
      case 'started':
        // A new runner (a new scenario, or Reset): everything starts over.
        s = initialStoryUi();
        break;
      case 'caption':
        if (typeof e.rendered === 'string') s = { ...s, rendered: { ...s.rendered, [captionKey(e.at)]: e.rendered } };
        break;
      case 'trigger': {
        const id = String(e.triggerId ?? '');
        if (typeof e.rendered !== 'string' || s.triggers.some((x) => x.id === id && x.at === e.at)) break;
        const note: TriggerNote = { id, at: e.at, text: e.rendered, ...(typeof e.aim === 'string' ? { aim: e.aim } : {}) };
        s = { ...s, triggers: [...s.triggers, note] };
        break;
      }
      case 'checkpoint':
        if (typeof e.checkpointId === 'string' && !s.answers[e.checkpointId]) s = { ...s, pending: e.checkpointId };
        break;
      case 'choice':
      case 'skip': {
        const cp = e.checkpointId;
        if (typeof cp !== 'string') break;
        const choiceId = e.kind === 'choice' && typeof e.choiceId === 'string' ? e.choiceId : null;
        s = { ...s, pending: s.pending === cp ? null : s.pending, answers: { ...s.answers, [cp]: { choiceId, at: e.at } } };
        break;
      }
      case 'ended':
        s = { ...s, ended: true };
        break;
      default:
        break;
    }
  }
  return s;
}

const stores = new WeakMap<PlayerStore, StoryUiStore>();

/** This player's story UI store, created on first use. */
export function storyUiFor(player: PlayerStore): StoryUiStore {
  let s = stores.get(player);
  if (!s) {
    s = createStoryUiStore();
    stores.set(player, s);
  }
  return s;
}

export function useStoryUi<T>(selector: (s: StoryUiState) => T): T {
  const store = storyUiFor(usePlayerStoreApi());
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}
