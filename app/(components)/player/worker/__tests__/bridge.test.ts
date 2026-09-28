import { describe, it, expect, beforeEach } from 'vitest';
import { createPlayerStore, initialPlayerState } from '../../store/playerStore';
import type { PlayerStore } from '../../store/playerStore';
import { WorkerBridge, type WorkerLike } from '../bridge';
import { getBridge } from '../bridgeRegistry';
import { onCalcReply, type CalcReply } from '../calcResults';
import { PROTOCOL_VERSION, type WorkerCommand, type WorkerMessage } from '../protocol';

/** A fake `Worker`: records every posted command and lets the test dispatch messages/errors back. */
class FakeWorker implements WorkerLike {
  readonly posted: WorkerCommand[] = [];
  terminated = false;
  private messageListeners: Array<(ev: { data: unknown }) => void> = [];
  private errorListeners: Array<(ev: unknown) => void> = [];
  private messageErrorListeners: Array<(ev: unknown) => void> = [];

  postMessage(message: unknown): void {
    this.posted.push(message as WorkerCommand);
  }

  terminate(): void {
    this.terminated = true;
  }

  addEventListener(type: string, listener: (ev: never) => void): void {
    if (type === 'message') this.messageListeners.push(listener as (ev: { data: unknown }) => void);
    else if (type === 'error') this.errorListeners.push(listener as (ev: unknown) => void);
    else if (type === 'messageerror') this.messageErrorListeners.push(listener as (ev: unknown) => void);
  }

  removeEventListener(): void {
    // Not exercised by these tests; the bridge never removes worker listeners (it terminates instead).
  }

  emit(message: WorkerMessage): void {
    for (const l of this.messageListeners) l({ data: message });
  }

  emitError(): void {
    for (const l of this.errorListeners) l(undefined);
  }

  emitMessageError(): void {
    for (const l of this.messageErrorListeners) l(undefined);
  }
}

function makeStore(): PlayerStore {
  return createPlayerStore(
    initialPlayerState({ diagramId: 'url-shortener', revision: 1, hasSimulation: true, runtimeUrl: '/engine/runtime/sim-worker.abc123.js' }),
  );
}

function makeVisibility() {
  let isHidden = false;
  const listeners = new Set<() => void>();
  return {
    api: {
      hidden: () => isHidden,
      onChange(cb: () => void) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
    },
    setHidden(v: boolean) {
      isHidden = v;
      for (const l of listeners) l();
    },
  };
}

describe('WorkerBridge', () => {
  let workers: FakeWorker[];
  let createWorker: (url: string) => WorkerLike;

  beforeEach(() => {
    workers = [];
    createWorker = () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    };
  });

  it('sends init with seq=1 on construction, protocol/simUrl/build/mode', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({
      runtimeUrl: '/engine/runtime/sim-worker.abc123.js',
      simUrl: '/dev/data/engine/diagrams/url-shortener.sim.bin',
      build: 'sha256:' + '0'.repeat(64),
      mode: 'free',
      store,
      createWorker,
      visibility: makeVisibility().api,
    });
    expect(workers).toHaveLength(1);
    expect(workers[0].posted).toHaveLength(1);
    const init = workers[0].posted[0];
    expect(init.type).toBe('init');
    expect(init.seq).toBe(1);
    if (init.type === 'init') {
      expect(init.protocol).toBe(PROTOCOL_VERSION);
      expect(init.simUrl).toContain('url-shortener');
      expect(init.mode).toBe('free');
    }
    bridge.dispose();
  });

  it('routes ready/keys/frame/status into the store, keeping only the latest frame', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({
      runtimeUrl: 'x',
      simUrl: 'y',
      build: 'sha256:' + '0'.repeat(64),
      mode: 'free',
      store,
      createWorker,
      visibility: makeVisibility().api,
    });
    const worker = workers[0];

    worker.emit({ type: 'ready', protocol: 1, engineVersion: '3.0.0', hash: 'sha256:x', tickMs: 100, metricKeys: ['g.e'], healthIds: ['a'], keysEpoch: 0 });
    expect(store.getState().sim.status).toBe('ready');
    expect(store.getState().sim.metricKeys).toEqual(['g.e']);

    worker.emit({ type: 'frame', t: 0.1, keysEpoch: 0, metrics: new Float64Array([1]), health: new Uint8Array([0]), watches: [], events: [] });
    expect(store.getState().sim.frame?.t).toBeCloseTo(0.1);
    expect(store.getState().sim.frameNo).toBe(1);

    worker.emit({ type: 'frame', t: 0.2, keysEpoch: 0, metrics: new Float64Array([2]), health: new Uint8Array([0]), watches: [], events: [] });
    expect(store.getState().sim.frame?.t).toBeCloseTo(0.2);
    expect(store.getState().sim.frameNo).toBe(2); // latest only: no history kept

    worker.emit({ type: 'status', playing: true, speed: 2, t: 0.2, runner: 'running', duration: 90 });
    expect(store.getState().sim.playing).toBe(true);
    expect(store.getState().sim.speed).toBe(2);
    expect(store.getState().story.runner).toBe('running');
    expect(store.getState().story.duration).toBe(90);

    bridge.dispose();
  });

  it('play/pause/setSpeed/applyAction send commands with increasing seq', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const worker = workers[0];
    bridge.play();
    bridge.pause();
    bridge.setSpeed(4);
    bridge.applyAction('kill', 'cache-redis', null);
    const types = worker.posted.slice(1).map((c) => c.type);
    expect(types).toEqual(['play', 'pause', 'setSpeed', 'applyAction']);
    const seqs = worker.posted.map((c) => c.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    bridge.dispose();
  });

  it('appends echoed actionApplied messages to the store action log', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const worker = workers[0];
    worker.emit({ type: 'actionApplied', seq: 2, action: [1.2, 'kill', 'cache-redis', null] });
    expect(store.getState().actions).toEqual([[1.2, 'kill', 'cache-redis', null]]);
    bridge.dispose();
  });

  it('a non-fatal error sets sim.errorCode without restarting the worker', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const worker = workers[0];
    worker.emit({ type: 'error', seq: 5, code: 'SIM_BAD_TARGET', message: 'bad target', fatal: false });
    expect(store.getState().sim.errorCode).toBe('SIM_BAD_TARGET');
    expect(workers).toHaveLength(1);
    expect(worker.terminated).toBe(false);
    bridge.dispose();
  });

  it('restarts the worker once on a fatal error and replays the action log via restore', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const first = workers[0];
    first.emit({ type: 'actionApplied', seq: 2, action: [1, 'kill', 'cache-redis', null] });
    first.emit({ type: 'frame', t: 3, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), watches: [], events: [] });

    first.emit({ type: 'error', seq: 9, code: 'FATAL', message: 'boom', fatal: true });
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    const second = workers[1];
    const init = second.posted[0];
    expect(init.type).toBe('init');
    if (init.type === 'init') {
      expect(init.restore?.actions).toEqual([[1, 'kill', 'cache-redis', null]]);
      expect(init.restore?.t).toBeCloseTo(3);
    }

    // A second fatal error gives up instead of restarting again.
    second.emit({ type: 'error', seq: 10, code: 'FATAL', message: 'boom again', fatal: true });
    expect(workers).toHaveLength(2);
    expect(store.getState().sim.status).toBe('error');

    bridge.dispose();
  });

  it('a worker.onerror and a messageerror both trigger the same fatal-restart path', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    workers[0].emitError();
    expect(workers).toHaveLength(2);
    workers[1].emitMessageError();
    expect(store.getState().sim.status).toBe('error'); // second failure: no more restarts
    bridge.dispose();
  });

  it('pauses when the tab is hidden and resumes if it was playing before', () => {
    const store = makeStore();
    const vis = makeVisibility();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: vis.api });
    const worker = workers[0];
    bridge.play();
    expect(store.getState().sim.playing).toBe(true);

    vis.setHidden(true);
    expect(store.getState().sim.playing).toBe(false);
    expect(worker.posted.some((c) => c.type === 'pause')).toBe(true);

    vis.setHidden(false);
    expect(store.getState().sim.playing).toBe(true);
    expect(worker.posted.filter((c) => c.type === 'play')).toHaveLength(2); // once by us, once on visibility return

    bridge.dispose();
  });

  it('does not resume on visibility return if it was already paused', () => {
    const store = makeStore();
    const vis = makeVisibility();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: vis.api });
    const worker = workers[0];
    vis.setHidden(true);
    vis.setHidden(false);
    expect(worker.posted.filter((c) => c.type === 'play')).toHaveLength(0);
    bridge.dispose();
  });

  it('dispose terminates the worker, stops visibility listening, and is idempotent', () => {
    const store = makeStore();
    const vis = makeVisibility();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: vis.api });
    const worker = workers[0];
    bridge.dispose();
    expect(worker.terminated).toBe(true);
    expect(worker.posted.some((c) => c.type === 'dispose')).toBe(true);

    // Idempotent: no crash, and further commands are dropped.
    bridge.dispose();
    bridge.play();
    expect(worker.posted.filter((c) => c.type === 'play')).toHaveLength(0);
  });

  it('scenario mode passes scenarioId in init', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({
      runtimeUrl: 'x',
      simUrl: 'y',
      build: 'b',
      mode: 'scenario',
      scenarioId: 'cache-outage',
      store,
      createWorker,
      visibility: makeVisibility().api,
    });
    const init = workers[0].posted[0];
    expect(init.type).toBe('init');
    if (init.type === 'init') expect(init.scenarioId).toBe('cache-outage');
    bridge.dispose();
  });

  it('merges frame.watches into sim.watches instead of replacing it, and skips the merge (keeps the same object) when a frame reports none', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const worker = workers[0];

    worker.emit({ type: 'frame', t: 0.1, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), watches: [['w0', true]], events: [] });
    expect(store.getState().sim.watches).toEqual({ w0: true });

    worker.emit({ type: 'frame', t: 0.2, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), watches: [['w1', false]], events: [] });
    expect(store.getState().sim.watches).toEqual({ w0: true, w1: false });

    const withBoth = store.getState().sim.watches;
    worker.emit({ type: 'frame', t: 0.3, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), watches: [], events: [] });
    expect(store.getState().sim.watches).toBe(withBoth); // same reference: no spurious re-render for selectors keyed on it

    worker.emit({ type: 'frame', t: 0.4, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), watches: [['w0', false]], events: [] });
    expect(store.getState().sim.watches).toEqual({ w0: false, w1: false });

    bridge.dispose();
  });

  it('registers itself in the bridge registry on construction and removes itself on dispose', () => {
    const store = makeStore();
    expect(getBridge(store)).toBeUndefined();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'b', mode: 'free', store, createWorker, visibility: makeVisibility().api });
    expect(getBridge(store)).toBe(bridge);
    bridge.dispose();
    expect(getBridge(store)).toBeUndefined();
  });

  it('calc returns its seq, sends dry only for a preview, and routes the reply (or a rejection) to calculator listeners', () => {
    const store = makeStore();
    const bridge = new WorkerBridge({ runtimeUrl: 'x', simUrl: 'y', build: 'sha256:' + '0'.repeat(64), mode: 'free', store, createWorker, visibility: makeVisibility().api });
    const worker = workers[0];
    const replies: CalcReply[] = [];
    const off = onCalcReply(store, (r) => replies.push(r));

    const previewSeq = bridge.calc('c1', { a: 1 }, true);
    const applySeq = bridge.calc('c1', { a: 2 });
    expect(applySeq).toBe(previewSeq + 1);
    const [preview, apply] = worker.posted.slice(-2);
    expect(preview).toEqual({ type: 'calc', seq: previewSeq, id: 'c1', values: { a: 1 }, dry: true });
    expect(apply).toEqual({ type: 'calc', seq: applySeq, id: 'c1', values: { a: 2 } });

    worker.emit({ type: 'calcResult', seq: previewSeq, id: 'c1', outputs: { out: 3 } });
    worker.emit({ type: 'error', seq: applySeq, code: 'EXPR_UNBOUND', message: 'x', fatal: false });
    expect(replies).toEqual([
      { seq: previewSeq, id: 'c1', outputs: { out: 3 } },
      { seq: applySeq, error: 'EXPR_UNBOUND' },
    ]);

    off();
    worker.emit({ type: 'calcResult', seq: 99, id: 'c1', outputs: {} });
    expect(replies).toHaveLength(2);
    bridge.dispose();
  });
});
