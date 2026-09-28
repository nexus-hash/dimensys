'use client';

/**
 * Playback command surface (T3.8): the timeline dock's transport buttons
 * and the Space/`[`/`]` shortcuts all go through this instead of reaching
 * for a `WorkerBridge` themselves — `getBridge` (see `bridgeRegistry.ts`)
 * is `undefined` until `InteractiveLayer` (T3.3) has actually constructed
 * one (no runtime bundle, no simulation, or not mounted yet), so every
 * command here is a safe no-op in that window rather than a throw.
 */
import { useCallback } from 'react';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';
import type { Speed } from '../worker/protocol';

export const SPEEDS: readonly Speed[] = [0.5, 1, 2, 4];

export interface PlaybackCommands {
  playing: boolean;
  speed: Speed;
  /** `sim.status`; controls are rendered disabled until this is `'ready'`. */
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
  t: number;
  /** Scenario mode only (`story.duration`); `null` in free play — no scrubber then. */
  duration: number | null;
  togglePlay(): void;
  cycleSpeed(dir: 1 | -1): void;
  seek(t: number): void;
  /** Back to the start state (the run's history and baseline start over too). */
  reset(): void;
}

export function usePlaybackCommands(): PlaybackCommands {
  const store = usePlayerStoreApi();
  const playing = usePlayerStore((s) => s.sim.playing);
  const speed = usePlayerStore((s) => s.sim.speed);
  const status = usePlayerStore((s) => s.sim.status);
  const t = usePlayerStore((s) => s.sim.frame?.t ?? 0);
  const duration = usePlayerStore((s) => s.story.duration);

  const togglePlay = useCallback(() => {
    const bridge = getBridge(store);
    if (!bridge) return;
    if (store.getState().sim.playing) bridge.pause();
    else bridge.play();
  }, [store]);

  const cycleSpeed = useCallback(
    (dir: 1 | -1) => {
      const bridge = getBridge(store);
      if (!bridge) return;
      const cur = store.getState().sim.speed;
      const i = SPEEDS.indexOf(cur);
      const next = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, i + dir))];
      if (next !== cur) bridge.setSpeed(next);
    },
    [store],
  );

  const seek = useCallback(
    (target: number) => {
      const bridge = getBridge(store);
      if (!bridge) return;
      const dur = store.getState().story.duration;
      const clamped = dur === null ? Math.max(0, target) : Math.max(0, Math.min(target, dur));
      bridge.seek(clamped);
    },
    [store],
  );

  const reset = useCallback(() => {
    const bridge = getBridge(store);
    if (!bridge) return;
    const wasPlaying = store.getState().sim.playing;
    bridge.reset();
    // The worker's reset leaves the run paused; a reset from a running
    // simulation starts the healthy baseline running again.
    if (wasPlaying) bridge.play();
  }, [store]);

  return { playing, speed, status, t, duration, togglePlay, cycleSpeed, seek, reset };
}
