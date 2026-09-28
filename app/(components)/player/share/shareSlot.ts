/**
 * Per-player share-link state that isn't the simulation's: the run a link
 * asks the worker to start from, and the user's own camera. Keyed by the
 * player store (one per mounted player), like the bridge registry, so the
 * board, the worker layer and the share controller meet without a
 * provider threaded through the shell.
 */
import type { PlayerStore } from '../store/playerStore';
import type { Speed } from '../worker/protocol';
import type { UserAction } from '../types';
import type { ShareCamera } from './codec';

/** The run a link rebuilds: read once by the worker layer when it starts the simulation. */
export interface BootRun {
  /** A scenario run, with the checkpoint answers the link recorded (`null` = passed without answering). */
  scenario?: { id: string; choices: Record<string, string | null> };
  actions: UserAction[];
  t: number;
  playing: boolean;
  speed: Speed;
  /** Called once the rebuilt run is ready, with how many of `actions` no longer resolved. */
  onReady(skipped: number): void;
}

interface Slot {
  boot: BootRun | null;
  camera: ShareCamera | null;
}

const slots = new WeakMap<PlayerStore, Slot>();

function slotFor(store: PlayerStore): Slot {
  let s = slots.get(store);
  if (!s) {
    s = { boot: null, camera: null };
    slots.set(store, s);
  }
  return s;
}

export function setBootRun(store: PlayerStore, run: BootRun | null): void {
  slotFor(store).boot = run;
}

/** The pending run, handed over once: a later start (a remount) begins healthy. */
export function takeBootRun(store: PlayerStore): BootRun | null {
  const s = slotFor(store);
  const run = s.boot;
  s.boot = null;
  return run;
}

/** The user's own view (`null` while the board is fitted or framed by a walkthrough step). */
export function setShareCamera(store: PlayerStore, camera: ShareCamera | null): void {
  slotFor(store).camera = camera;
}

export function getShareCamera(store: PlayerStore): ShareCamera | null {
  return slotFor(store).camera;
}
