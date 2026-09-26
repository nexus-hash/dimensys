'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPlayerStore, initialPlayerState } from '@/app/(components)/player/store/playerStore';
import type { PlayerState } from '@/app/(components)/player/store/playerStore';
import { WorkerBridge } from '@/app/(components)/player/worker/bridge';

export interface DevWorkerClientProps {
  simUrl: string;
  build: string;
  runtimeUrl: string;
  title: string;
}

const KILL_TARGET = 'cache-redis';
/** A handful of representative metrics; the full column set is in `sim.metricKeys`. */
const HEADLINE_METRICS = ['global.throughputRps', 'global.p99Ms', 'global.errorRate', 'global.availability', 'global.costPerMonth'];

/** Live text readout + play/pause + one Break It action, driven entirely by `WorkerBridge` against the real worker bundle. */
export function DevWorkerClient({ simUrl, build, runtimeUrl, title }: DevWorkerClientProps) {
  const store = useMemo(
    () => createPlayerStore(initialPlayerState({ diagramId: title, revision: 1, hasSimulation: true, runtimeUrl })),
    [runtimeUrl, title],
  );
  const state = useSyncExternalStore(store.subscribe, () => store.getState(), () => store.getState());
  const bridgeRef = useRef<WorkerBridge | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    const bridge = new WorkerBridge({ runtimeUrl, simUrl, build, mode: 'free', store });
    bridgeRef.current = bridge;
    return () => {
      bridge.dispose();
      bridgeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `store` is stable for this mount (see useMemo above).
  }, [runtimeUrl, simUrl, build]);

  const sim = state.sim;
  const frame = sim.frame;

  return (
    <div className="space-y-4 rounded-lg border border-line-hairline p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-secondary">status: {sim.status}</span>
        <span className="text-sm text-ink-secondary">t = {frame ? frame.t.toFixed(1) : '—'}s</span>
        <span className="text-sm text-ink-secondary">speed: {sim.speed}x</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-line-hairline px-3 py-1 text-sm"
          disabled={sim.status !== 'ready' || sim.playing}
          onClick={() => bridgeRef.current?.play()}
        >
          Play
        </button>
        <button
          type="button"
          className="rounded border border-line-hairline px-3 py-1 text-sm"
          disabled={sim.status !== 'ready' || !sim.playing}
          onClick={() => bridgeRef.current?.pause()}
        >
          Pause
        </button>
        <button
          type="button"
          className="rounded border border-line-hairline px-3 py-1 text-sm"
          disabled={sim.status !== 'ready'}
          onClick={() => {
            bridgeRef.current?.applyAction('kill', KILL_TARGET, null);
            setLastAction(`kill ${KILL_TARGET}`);
          }}
        >
          Kill cache
        </button>
      </div>

      {lastAction && <p className="text-xs text-ink-secondary">last action sent: {lastAction}</p>}
      {sim.errorCode && (
        <p role="alert" className="text-sm text-red-600">
          error: {sim.errorCode}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {HEADLINE_METRICS.map((key) => (
          <MetricRow key={key} label={key} value={metricValue(sim, key)} />
        ))}
      </dl>

      <details>
        <summary className="cursor-pointer text-sm text-ink-secondary">all {sim.metricKeys.length} metric columns</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {sim.metricKeys.map((key) => (
            <MetricRow key={key} label={key} value={metricValue(sim, key)} />
          ))}
        </dl>
      </details>
    </div>
  );
}

function metricValue(sim: PlayerState['sim'], key: string): number | null {
  const i = sim.metricKeys.indexOf(key);
  if (i < 0 || !sim.frame) return null;
  const v = sim.frame.metrics[i];
  return Number.isNaN(v) ? null : v;
}

function MetricRow({ label, value }: { label: string; value: number | null }) {
  return (
    <>
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular-nums">{value === null ? '—' : value.toFixed(3)}</dd>
    </>
  );
}
