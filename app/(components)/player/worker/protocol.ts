/**
 * Worker bridge protocol (T2.13).
 *
 * The simulation runtime is a prebuilt, minified worker bundle served from
 * `/engine/runtime/` (never build-tool source in this repo). The app and
 * that bundle only share this message contract: plain structured-clone data,
 * plus transferable typed arrays for the 10 Hz metric frames.
 *
 * This file is the app side of the contract. The producing side keeps a copy
 * (`src/worker/protocol.ts` in the engine repo) and the two are tied
 * together by `PROTOCOL_VERSION`, checked in the `ready` handshake. Any
 * breaking change bumps it; a structural-parity test on the engine side
 * compares the two files' shapes.
 */
import type { RunnerEventLike, UserAction } from '../types';

export const PROTOCOL_VERSION = 1;

/** Playback speeds the UI offers. */
export type Speed = 0.5 | 1 | 2 | 4;

/** Snapshot cadence to the UI, in Hz (T2.13). */
export const SNAPSHOT_HZ = 10;

// ---------------------------------------------------------------------------
// Main thread → worker
// ---------------------------------------------------------------------------

interface Cmd<K extends string> {
  type: K;
  /** Monotonic per-bridge sequence number; echoed in `ack` / `error`. */
  seq: number;
}

/**
 * Starts (or restarts) a run. The worker fetches the opaque sim payload
 * itself (`simUrl`), so the full document never travels through React props
 * or the RSC payload. `build` is checked against the payload's own build
 * hash; a mismatch is a fatal `error` (stale cache or bad sync).
 */
export interface InitCmd extends Cmd<'init'> {
  protocol: typeof PROTOCOL_VERSION;
  simUrl: string;
  build: string;
  /** `free` = free play (no end, no scrubber); `scenario` = story / replay timeline. */
  mode: 'free' | 'scenario';
  scenarioId?: string;
  /** Overrides the document's default seed (tests only; share links never carry a seed). */
  seed?: string | number;
  /** Share-link restore: action log to replay, checkpoint answers, and the target time. */
  restore?: {
    actions: UserAction[];
    choices?: { [checkpointId: string]: string | null };
    t?: number;
  };
  /** Start paused (e.g. reduced motion or a hidden tab). */
  paused?: boolean;
}

export type PlayCmd = Cmd<'play'>;
export type PauseCmd = Cmd<'pause'>;
export interface SetSpeedCmd extends Cmd<'setSpeed'> {
  speed: Speed;
}
/** Back to the scenario's start state ("Reset"). Clears the action log. */
export type ResetCmd = Cmd<'reset'>;

/**
 * A user move. The worker stamps `t` itself at the next tick boundary and
 * echoes the canonical action in `actionApplied`; only echoed actions go
 * into the share log, so recording and replay land on the same tick.
 */
export interface ApplyActionCmd extends Cmd<'applyAction'> {
  tool: string;
  target: string | null;
  value: number | string | boolean | null;
}

export interface ChooseCmd extends Cmd<'choose'> {
  checkpointId: string;
  choiceId: string;
}
export interface SkipCmd extends Cmd<'skip'> {
  checkpointId?: string;
}
export type ContinueCaptionCmd = Cmd<'continueCaption'>;
/** Scenario mode only: restore the nearest runner snapshot ≤ t and run forward. */
export interface SeekCmd extends Cmd<'seek'> {
  t: number;
}
/** Evaluates one calculator: applies bound inputs/outputs as patches, answers `calcResult`. */
export interface CalcCmd extends Cmd<'calc'> {
  id: string;
  values: { [inputId: string]: number };
}
/** Answers `headline` with the share headline rendered from live metrics, or `null` when none is authored. */
export type RenderHeadlineCmd = Cmd<'renderHeadline'>;
export type DisposeCmd = Cmd<'dispose'>;

export type WorkerCommand =
  | InitCmd
  | PlayCmd
  | PauseCmd
  | SetSpeedCmd
  | ResetCmd
  | ApplyActionCmd
  | ChooseCmd
  | SkipCmd
  | ContinueCaptionCmd
  | SeekCmd
  | CalcCmd
  | RenderHeadlineCmd
  | DisposeCmd;

// ---------------------------------------------------------------------------
// Worker → main thread
// ---------------------------------------------------------------------------

/** Handshake after `init`. Fixes the column order of every later `frame`. */
export interface ReadyMsg {
  type: 'ready';
  protocol: number;
  engineVersion: string;
  /** Build hash of the document actually loaded. */
  hash: string;
  tickMs: number;
  /** Column order for `frame.metrics` (`node:<id>.<metric>`, `global.<metric>`, …). */
  metricKeys: string[];
  /** Row order for `frame.health` (node and link IDs). */
  healthIds: string[];
  /** Bumped whenever `metricKeys`/`healthIds` change; frames carry the epoch they use. */
  keysEpoch: number;
}

/** Re-sent key tables after the node/link set changes. */
export interface KeysMsg {
  type: 'keys';
  metricKeys: string[];
  healthIds: string[];
  keysEpoch: number;
}

/**
 * The 10 Hz snapshot. Columnar and transferable: `metrics` is a
 * `Float64Array` aligned to `metricKeys` (NaN = not published), `health` a
 * `Uint8Array` of `HEALTH_CODES` indices aligned to `healthIds`. Both are
 * posted in the transfer list, so nothing is copied.
 */
export interface FrameMsg {
  type: 'frame';
  /** Simulated seconds (tick-boundary value). */
  t: number;
  keysEpoch: number;
  metrics: Float64Array;
  health: Uint8Array;
  /** Watch results this frame: `[id, pass]`. */
  watches: Array<[string, boolean]>;
  /** Runner events emitted since the previous frame, in order. */
  events: RunnerEventLike[];
}

export interface StatusMsg {
  type: 'status';
  playing: boolean;
  speed: Speed;
  t: number;
  /** Scenario mode only. */
  runner?: 'running' | 'paused-checkpoint' | 'paused-caption' | 'done';
  /** Scenario mode only: total length in seconds, for the scrubber. */
  duration?: number;
}

/** A user action accepted and stamped at a tick boundary: append to the share log. */
export interface ActionAppliedMsg {
  type: 'actionApplied';
  seq: number;
  action: UserAction;
}

/** Answers a `calc` command: computed outputs, keyed by output id. */
export interface CalcResultMsg {
  type: 'calcResult';
  seq: number;
  id: string;
  outputs: { [outputId: string]: number };
}

/** Answers a `renderHeadline` command. `null` when the diagram authors no headline. */
export interface HeadlineMsg {
  type: 'headline';
  seq: number;
  text: string | null;
}

export interface AckMsg {
  type: 'ack';
  seq: number;
}

/**
 * `fatal: false` → the command was rejected, the run continues (bad target,
 * unknown intervention). `fatal: true` → the run is dead; the bridge restarts
 * the worker once and replays the log. A second failure shows the inline
 * error card, and the static frame stays. A protocol or hash mismatch on
 * `ready` is fatal and gets no restart.
 */
export interface ErrorMsg {
  type: 'error';
  seq: number | null;
  code: string;
  message: string;
  fatal: boolean;
}

export type WorkerMessage =
  | ReadyMsg
  | KeysMsg
  | FrameMsg
  | StatusMsg
  | ActionAppliedMsg
  | CalcResultMsg
  | HeadlineMsg
  | AckMsg
  | ErrorMsg;

/** Index order for `FrameMsg.health`. */
export const HEALTH_CODES = ['ok', 'warn', 'critical', 'info', 'accent', 'muted'] as const;

const WORKER_MESSAGE_TYPES: ReadonlySet<string> = new Set<WorkerMessage['type']>([
  'ready',
  'keys',
  'frame',
  'status',
  'actionApplied',
  'calcResult',
  'headline',
  'ack',
  'error',
]);

/** Cheap structural check for `message` events from the worker (untrusted bundle boundary). */
export function isWorkerMessage(data: unknown): data is WorkerMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { type?: unknown }).type === 'string' &&
    WORKER_MESSAGE_TYPES.has((data as { type: string }).type)
  );
}
