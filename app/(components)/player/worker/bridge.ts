/**
 * Worker bridge (T2.13): creates the sim runtime Worker from a hashed bundle
 * URL, sends protocol commands with a monotonic `seq`, and routes replies
 * into a `PlayerStore` — the latest frame only, at the worker's own 10 Hz
 * cadence (`SNAPSHOT_HZ`).
 *
 * Share links: `restore` starts the very first run from an action log at a
 * time (the worker rebuilds it tick by tick, deterministically), and
 * `onRestored` reports how many of those actions no longer resolved.
 *
 * Resilience: on a fatal error (`error.fatal`, `worker.onerror` or a
 * `messageerror`) the bridge restarts the underlying worker exactly once,
 * re-`init`s it with the store's own action log as `restore`, and only then
 * gives up (leaving `sim.status` as `'error'`). It pauses the run whenever
 * the tab is hidden (`document.visibilitychange`) and resumes it if it was
 * playing before, and disposes cleanly on `dispose()` (matching a React
 * effect cleanup / component unmount).
 */
import type { PlayerStore } from '../store/playerStore';
import {
  PROTOCOL_VERSION,
  isWorkerMessage,
  type CalcCmd,
  type InitCmd,
  type RenderHeadlineCmd,
  type Speed,
  type WorkerCommand,
  type WorkerMessage,
} from './protocol';
import { registerBridge, unregisterBridge } from './bridgeRegistry';
import { publishCalcReply } from './calcResults';
import { setLeadUp } from '../metrics/leadUp';
import { publishRunnerEvents } from './runnerEvents';
import type { UserAction } from '../types';

/** The subset of the real `Worker` API the bridge needs — small enough for tests to fake without a real Worker thread. */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (ev: { data: unknown }) => void): void;
  addEventListener(type: 'error', listener: (ev: unknown) => void): void;
  addEventListener(type: 'messageerror', listener: (ev: unknown) => void): void;
  removeEventListener(type: string, listener: (ev: unknown) => void): void;
}

export interface WorkerBridgeOptions {
  /** Hashed worker bundle URL, from the sync manifest (`PlayerBootstrap.runtimeUrl`). Never `null`: the caller checks that first. */
  runtimeUrl: string;
  /** Where the worker fetches the opaque sim payload from. */
  simUrl: string;
  /** Build hash the payload must match (`ViewData.build`). */
  build: string;
  mode: 'free' | 'scenario';
  scenarioId?: string;
  store: PlayerStore;
  /** Start the first run rebuilt from this log at `t` (a share link) instead of the healthy start. */
  restore?: { actions: readonly UserAction[]; t: number; choices?: { [checkpointId: string]: string | null } };
  /** Start paused. */
  startPaused?: boolean;
  /** Called once, when the `restore` run is ready: how many of its actions were skipped. */
  onRestored?: (skipped: number) => void;
  /** Injection point for tests; defaults to `new Worker(runtimeUrl, { type: 'module' })`. */
  createWorker?: (url: string) => WorkerLike;
  /** Injection point for tests; defaults to `document.hidden` / `document.addEventListener`. */
  visibility?: {
    hidden(): boolean;
    onChange(cb: () => void): () => void;
  };
}

const defaultCreateWorker = (url: string): WorkerLike => new Worker(url, { type: 'module' }) as unknown as WorkerLike;

const defaultVisibility = {
  hidden: () => typeof document !== 'undefined' && document.hidden,
  onChange(cb: () => void): () => void {
    if (typeof document === 'undefined') return () => {};
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  },
};

export class WorkerBridge {
  private opts: WorkerBridgeOptions;
  private readonly createWorker: (url: string) => WorkerLike;
  private readonly visibility: NonNullable<WorkerBridgeOptions['visibility']>;
  private worker: WorkerLike | null = null;
  private seq = 0;
  private disposed = false;
  private restartedOnce = false;
  /** The log the current worker was started from, until its `ready` says which entries it kept. */
  private restoring: UserAction[] | null = null;
  private onRestored: ((skipped: number) => void) | null = null;
  private wasPlayingBeforeHide = false;
  private stopVisibility: (() => void) | null = null;

  constructor(options: WorkerBridgeOptions) {
    this.opts = options;
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.visibility = options.visibility ?? defaultVisibility;
    if (options.mode === 'scenario' && options.scenarioId) {
      this.opts.store.setState((s) => ({ story: { ...s.story, scenarioId: options.scenarioId! } }));
    }
    if (options.restore) {
      const actions = [...options.restore.actions];
      this.opts.store.setState({ actions });
      this.onRestored = options.onRestored ?? null;
      this.startWorker({ actions, t: options.restore.t, ...(options.restore.choices ? { choices: options.restore.choices } : {}) }, !!options.startPaused);
    } else {
      this.startWorker(undefined, !!options.startPaused);
    }
    this.stopVisibility = this.visibility.onChange(() => this.onVisibilityChange());
    // Registered synchronously, before any worker message can land — see
    // `bridgeRegistry.ts` for why that ordering is the whole point (T3.8's
    // HUD/timeline commands read this store's bridge without owning it).
    registerBridge(this.opts.store, this);
  }

  // -------------------------------------------------------------------------
  // Commands (main thread -> worker)
  // -------------------------------------------------------------------------

  play(): void {
    this.opts.store.setState((s) => ({ sim: { ...s.sim, playing: true } }));
    this.send({ type: 'play', seq: this.nextSeq() });
  }

  pause(): void {
    this.opts.store.setState((s) => ({ sim: { ...s.sim, playing: false } }));
    this.send({ type: 'pause', seq: this.nextSeq() });
  }

  setSpeed(speed: Speed): void {
    this.send({ type: 'setSpeed', seq: this.nextSeq(), speed });
  }

  reset(): void {
    this.opts.store.setState({ actions: [] });
    this.send({ type: 'reset', seq: this.nextSeq() });
  }

  applyAction(tool: string, target: string | null, value: number | string | boolean | null = null): void {
    this.send({ type: 'applyAction', seq: this.nextSeq(), tool, target, value });
  }

  choose(checkpointId: string, choiceId: string): void {
    this.send({ type: 'choose', seq: this.nextSeq(), checkpointId, choiceId });
  }

  skip(checkpointId?: string): void {
    this.send({ type: 'skip', seq: this.nextSeq(), checkpointId });
  }

  continueCaption(): void {
    this.send({ type: 'continueCaption', seq: this.nextSeq() });
  }

  seek(t: number): void {
    this.send({ type: 'seek', seq: this.nextSeq(), t });
  }

  /**
   * Rebuilds the run in a fresh worker from `actions`, fast-forwarded to
   * `t`, and makes that the action log. This is how one change is taken
   * back out of the log (a reverted fix): the result is exactly the run
   * that would have happened without it, and the share link stays the
   * shorter log. Keeps playing if it was playing. Doesn't use up the one
   * crash restart. Calculator applies are in the log like everything else.
   */
  replay(actions: readonly UserAction[], t: number): void {
    if (this.disposed) return;
    const wasPlaying = this.opts.store.getState().sim.playing;
    const old = this.worker;
    this.worker = null;
    old?.terminate();
    this.opts.store.setState({ actions: [...actions] });
    this.startWorker({ actions: [...actions], t }, !wasPlaying);
  }

  /**
   * Starts a different run in a fresh worker: free play, or one scenario
   * from its start. The action log, applied calculators and the scenario
   * slice start over; the new run plays as soon as it's ready. Doesn't use
   * up the one crash restart.
   */
  restart(mode: 'free' | 'scenario', scenarioId?: string): void {
    if (this.disposed) return;
    const old = this.worker;
    this.worker = null;
    old?.terminate();
    this.opts = { ...this.opts, mode, scenarioId: mode === 'scenario' ? scenarioId : undefined };
    this.restoring = null;
    this.onRestored = null;
    this.opts.store.setState((s) => ({
      actions: [],
      sim: { ...s.sim, playing: false, errorCode: undefined },
      story: { scenarioId: mode === 'scenario' ? (scenarioId ?? null) : null, runner: null, duration: null },
    }));
    this.startWorker(undefined, false);
  }

  /**
   * Evaluates a calculator. `dry` only previews the outputs; without it the
   * worker also applies the calculator's binds to the live run, and logs
   * the apply as a `calc` action (echoed like any other). Returns the
   * command's `seq`: the reply (`calcResults.ts`) carries the same one.
   */
  calc(id: string, values: CalcCmd['values'], dry = false): number {
    const seq = this.nextSeq();
    this.send({ type: 'calc', seq, id, values, ...(dry ? { dry: true as const } : {}) });
    return seq;
  }

  renderHeadline(): void {
    this.send({ type: 'renderHeadline', seq: this.nextSeq() } satisfies RenderHeadlineCmd);
  }

  /** Terminates the worker and stops listening. Idempotent; call from a React effect cleanup / on unmount. */
  dispose(): void {
    if (this.disposed) return;
    this.stopVisibility?.();
    this.stopVisibility = null;
    if (this.worker) {
      this.worker.postMessage({ type: 'dispose', seq: this.nextSeq() } satisfies WorkerCommand);
      this.worker.terminate();
      this.worker = null;
    }
    this.disposed = true;
    unregisterBridge(this.opts.store, this);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  private send(cmd: WorkerCommand): void {
    if (this.disposed || !this.worker) return;
    this.worker.postMessage(cmd);
  }

  private startWorker(restore?: InitCmd['restore'], paused = false): void {
    const worker = this.createWorker(this.opts.runtimeUrl);
    this.worker = worker;
    worker.addEventListener('message', (ev) => this.onMessage(ev.data));
    worker.addEventListener('error', () => this.onFatal());
    worker.addEventListener('messageerror', () => this.onFatal());

    this.restoring = restore ? [...restore.actions] : null;
    const init: InitCmd = {
      type: 'init',
      seq: this.nextSeq(),
      protocol: PROTOCOL_VERSION,
      simUrl: this.opts.simUrl,
      build: this.opts.build,
      mode: this.opts.mode,
      ...(this.opts.scenarioId !== undefined ? { scenarioId: this.opts.scenarioId } : {}),
      ...(restore ? { restore } : {}),
      paused: paused || this.visibility.hidden(),
    };
    this.opts.store.setState((s) => ({ sim: { ...s.sim, status: 'loading' } }));
    worker.postMessage(init);
  }

  private onVisibilityChange(): void {
    if (this.disposed) return;
    if (this.visibility.hidden()) {
      this.wasPlayingBeforeHide = this.opts.store.getState().sim.playing;
      if (this.wasPlayingBeforeHide) this.pause();
    } else if (this.wasPlayingBeforeHide) {
      this.wasPlayingBeforeHide = false;
      this.play();
    }
  }

  private onMessage(data: unknown): void {
    if (!isWorkerMessage(data)) return;
    const msg: WorkerMessage = data;
    switch (msg.type) {
      case 'ready':
        this.opts.store.setState((s) => ({
          sim: { ...s.sim, status: 'ready', keysEpoch: msg.keysEpoch, metricKeys: msg.metricKeys, healthIds: msg.healthIds },
        }));
        // A share link's run: the HUD gets the lead-up this page never saw.
        if (this.onRestored && msg.past) setLeadUp(this.opts.store, msg.past);
        this.settleRestore(msg.skipped ?? []);
        return;
      case 'keys':
        this.opts.store.setState((s) => ({
          sim: { ...s.sim, keysEpoch: msg.keysEpoch, metricKeys: msg.metricKeys, healthIds: msg.healthIds },
        }));
        return;
      case 'frame':
        this.opts.store.setState((s) => ({
          sim: {
            ...s.sim,
            frame: { t: msg.t, keysEpoch: msg.keysEpoch, metrics: msg.metrics, health: msg.health },
            frameNo: s.sim.frameNo + 1,
            // Merged, not replaced: a watch id already known keeps its last
            // reported value between frames that don't re-evaluate it
            // (`msg.watches` may be the full current set or just this
            // tick's changes — merging is correct either way).
            watches: msg.watches.length ? { ...s.sim.watches, ...Object.fromEntries(msg.watches) } : s.sim.watches,
          },
        }));
        if (msg.events.length) publishRunnerEvents(this.opts.store, msg.events);
        return;
      case 'status':
        this.opts.store.setState((s) => ({
          sim: { ...s.sim, playing: msg.playing, speed: msg.speed },
          story:
            msg.runner !== undefined
              ? { ...s.story, runner: msg.runner, duration: msg.duration ?? s.story.duration }
              : s.story,
        }));
        return;
      case 'actionApplied':
        this.opts.store.setState((s) => ({ actions: [...s.actions, msg.action] }));
        return;
      case 'calcResult':
        publishCalcReply(this.opts.store, { seq: msg.seq, id: msg.id, outputs: msg.outputs });
        return;
      case 'headline':
      case 'ack':
        return;
      case 'error':
        if (msg.fatal) this.onFatal();
        else {
          this.opts.store.setState((s) => ({ sim: { ...s.sim, errorCode: msg.code } }));
          if (msg.seq !== null) publishCalcReply(this.opts.store, { seq: msg.seq, error: msg.code });
        }
        return;
    }
  }

  /** The worker kept all but `skipped` of the log it was started from: make the store's log match. */
  private settleRestore(skipped: readonly number[]): void {
    const restoring = this.restoring;
    this.restoring = null;
    if (restoring && skipped.length) {
      const drop = new Set(skipped);
      this.opts.store.setState({ actions: restoring.filter((_, i) => !drop.has(i)) });
    }
    const report = this.onRestored;
    this.onRestored = null;
    report?.(restoring ? skipped.length : 0);
  }

  private onFatal(): void {
    if (this.disposed) return;
    const oldWorker = this.worker;
    this.worker = null;
    oldWorker?.terminate();

    if (this.restartedOnce) {
      this.opts.store.setState((s) => ({ sim: { ...s.sim, status: 'error' } }));
      return;
    }
    this.restartedOnce = true;
    const state = this.opts.store.getState();
    const lastT = state.sim.frame?.t;
    this.startWorker({ actions: [...state.actions], ...(lastT !== undefined ? { t: lastT } : {}) });
  }
}
