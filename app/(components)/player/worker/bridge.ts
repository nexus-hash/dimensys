/**
 * Worker bridge (T2.13): creates the sim runtime Worker from a hashed bundle
 * URL, sends protocol commands with a monotonic `seq`, and routes replies
 * into a `PlayerStore` — the latest frame only, at the worker's own 10 Hz
 * cadence (`SNAPSHOT_HZ`).
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
  private readonly opts: WorkerBridgeOptions;
  private readonly createWorker: (url: string) => WorkerLike;
  private readonly visibility: NonNullable<WorkerBridgeOptions['visibility']>;
  private worker: WorkerLike | null = null;
  private seq = 0;
  private disposed = false;
  private restartedOnce = false;
  private wasPlayingBeforeHide = false;
  private stopVisibility: (() => void) | null = null;

  constructor(options: WorkerBridgeOptions) {
    this.opts = options;
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.visibility = options.visibility ?? defaultVisibility;
    this.startWorker();
    this.stopVisibility = this.visibility.onChange(() => this.onVisibilityChange());
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

  calc(id: string, values: CalcCmd['values']): void {
    this.send({ type: 'calc', seq: this.nextSeq(), id, values });
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

  private startWorker(restore?: InitCmd['restore']): void {
    const worker = this.createWorker(this.opts.runtimeUrl);
    this.worker = worker;
    worker.addEventListener('message', (ev) => this.onMessage(ev.data));
    worker.addEventListener('error', () => this.onFatal());
    worker.addEventListener('messageerror', () => this.onFatal());

    const init: InitCmd = {
      type: 'init',
      seq: this.nextSeq(),
      protocol: PROTOCOL_VERSION,
      simUrl: this.opts.simUrl,
      build: this.opts.build,
      mode: this.opts.mode,
      ...(this.opts.scenarioId !== undefined ? { scenarioId: this.opts.scenarioId } : {}),
      ...(restore ? { restore } : {}),
      paused: this.visibility.hidden(),
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
          },
        }));
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
      case 'headline':
      case 'ack':
        return;
      case 'error':
        if (msg.fatal) this.onFatal();
        else this.opts.store.setState((s) => ({ sim: { ...s.sim, errorCode: msg.code } }));
        return;
    }
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
