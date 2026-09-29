'use client';

/**
 * Rolling per-key metric history (T3.7): the inspector's live sparklines
 * read any frame column by its full neutral key (`n:<nodeId>.<code>`, see
 * `metricKeys.ts`), where the HUD's `useGlobalMetricsFeed` reads only the
 * `g.*` ones. Same rules as that feed, so the two always agree: one sample
 * per new frame, a sample at an unchanged `t` replaces the last one
 * (paused), a jump back in time (Reset, a scrub) starts every history over,
 * and the history is only read from the store-subscribe callback, never
 * from render — the published feed is real state.
 *
 * Only mounted while its inspector section is showing, so an unopened panel
 * costs nothing.
 */
import { useEffect, useRef, useState } from 'react';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { MetricSample } from './useGlobalMetricsFeed';

export interface MetricSeries {
  /** Latest reading, `undefined` if this build doesn't publish the key or no frame has arrived yet. */
  value: number | undefined;
  /** Oldest first, covering the last `windowSec` simulated seconds. */
  history: readonly MetricSample[];
}

export interface MetricSeriesFeed {
  /** Simulated seconds of the latest frame (0 before the first one). */
  t: number;
  series: Readonly<Record<string, MetricSeries>>;
}

/** A `t` this far behind the last-seen max means the run restarted. Matches `useGlobalMetricsFeed`. */
const RESTART_EPSILON_SEC = 0.5;

function emptyFeed(keys: readonly string[]): MetricSeriesFeed {
  const series: Record<string, MetricSeries> = {};
  for (const key of keys) series[key] = { value: undefined, history: [] };
  return { t: 0, series };
}

/** Column index per key, rebuilt only when the worker re-sends its key table. */
function indexKeys(metricKeys: readonly string[], keys: readonly string[]): Map<string, number> {
  const wanted = new Set(keys);
  const cols = new Map<string, number>();
  metricKeys.forEach((key, i) => {
    if (wanted.has(key)) cols.set(key, i);
  });
  return cols;
}

export function useMetricSeriesFeed(keys: readonly string[], windowSec = 60): MetricSeriesFeed {
  const store = usePlayerStoreApi();
  const keysKey = keys.join('|');
  const [feed, setFeed] = useState<MetricSeriesFeed>(() => emptyFeed(keys));
  const historiesRef = useRef<Map<string, MetricSample[]>>(new Map());
  const maxTRef = useRef(0);
  const lastFrameNoRef = useRef(-1);

  useEffect(() => {
    const list = keysKey ? keysKey.split('|') : [];
    let indexFor: readonly string[] | null = null;
    let index = new Map<string, number>();

    const onStore = () => {
      const state = store.getState();
      const frame = state.sim.frame;
      if (!frame || state.sim.frameNo === lastFrameNoRef.current) return;
      lastFrameNoRef.current = state.sim.frameNo;
      if (indexFor !== state.sim.metricKeys) {
        indexFor = state.sim.metricKeys;
        index = indexKeys(indexFor, list);
      }

      if (frame.t < maxTRef.current - RESTART_EPSILON_SEC) {
        historiesRef.current.clear();
        maxTRef.current = frame.t;
      } else {
        maxTRef.current = Math.max(maxTRef.current, frame.t);
      }

      const series: Record<string, MetricSeries> = {};
      for (const key of list) {
        const col = index.get(key);
        const raw = col === undefined ? Number.NaN : frame.metrics[col];
        const v = Number.isNaN(raw) ? undefined : raw;
        let hist = historiesRef.current.get(key);
        if (!hist) {
          hist = [];
          historiesRef.current.set(key, hist);
        }
        if (v !== undefined) {
          if (hist.length === 0 || hist[hist.length - 1].t !== frame.t) hist.push({ t: frame.t, v });
          else hist[hist.length - 1] = { t: frame.t, v };
          const cutoff = frame.t - windowSec;
          while (hist.length > 1 && hist[0].t < cutoff) hist.shift();
        }
        // A fresh array per publish: consumers memoise on identity.
        series[key] = { value: v, history: hist.slice() };
      }
      setFeed({ t: frame.t, series });
    };

    // A section opened mid-run shows the current frame straight away rather
    // than waiting for the next one.
    onStore();
    return store.subscribe(onStore);
  }, [store, keysKey, windowSec]);

  return feed;
}
