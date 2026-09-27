'use client';

/**
 * Shared global-metrics source (T3.8): the one hook the HUD tiles and the
 * requirement badges both read, so they (and later Break It's own live
 * readouts, per the brief) always agree with each other and with the
 * store — no second subscription, no re-derived thresholds, one history
 * buffer per metric code.
 *
 * Re-renders at the worker's own frame cadence (`SNAPSHOT_HZ`, currently
 * 10 Hz — see `worker/protocol.ts`), which already sits inside the spec's
 * "throttled UI rate (4–10 Hz)" budget, so this adds no extra timer of its
 * own; four mono tiles + a handful of badges re-rendering at 10 Hz is cheap.
 *
 * The rolling 60s history and the baseline snapshot live in refs, but are
 * only ever *read* from inside the store-subscribe callback (an event, not
 * render) — the computed `GlobalMetricsFeed` those reads produce is what
 * gets published, via `setState`, for render to read. Building the feed
 * straight off the refs inside a render-phase `useMemo` looks equivalent
 * but isn't: refs are for imperative code, not values a render depends on
 * (`react-hooks/refs` — reading `.current` during render can silently skip
 * an update after a fast-path bail-out), so this hook keeps the "current
 * feed" as real state instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { buildGlobalMetricIndex, readGlobalMetric } from './globalMetrics';

export interface MetricSample {
  t: number;
  v: number;
}

export interface GlobalMetricState {
  /** Latest reading, `undefined` if this build doesn't publish the code or no frame has arrived yet. */
  value: number | undefined;
  /** This metric's value at the start of the current run (t≈0) — the HUD tile's delta baseline. `undefined` until the first reading. */
  baseline: number | undefined;
  /** Rolling last-60-simulated-seconds window, oldest first. */
  history: readonly MetricSample[];
}

const HISTORY_WINDOW_SEC = 60;
/** A `t` this far *behind* the last-seen max means playback restarted (Reset, or a scrub back to 0) — recapture the baseline and clear history rather than read them as one continuous run. */
const RESTART_EPSILON_SEC = 0.5;

export interface GlobalMetricsFeed {
  /** Simulated seconds of the latest frame (0 before the first one). */
  t: number;
  metrics: Readonly<Record<string, GlobalMetricState>>;
  /** Latest pass/fail per watch id (mirrors `PlayerState.sim.watches`) — the requirement badges' source. */
  watches: Readonly<Record<string, boolean>>;
}

function emptyFeed(codes: readonly string[]): GlobalMetricsFeed {
  const metrics: Record<string, GlobalMetricState> = {};
  for (const code of codes) metrics[code] = { value: undefined, baseline: undefined, history: [] };
  return { t: 0, metrics, watches: {} };
}

/** Subscribes to every `g.<code>` in `codes`, plus every watch id — one shared feed for the HUD strip and the requirement badges. */
export function useGlobalMetricsFeed(codes: readonly string[]): GlobalMetricsFeed {
  const store = usePlayerStoreApi();
  const historiesRef = useRef<Map<string, MetricSample[]>>(new Map());
  const baselinesRef = useRef<Map<string, number>>(new Map());
  const maxTRef = useRef(0);
  const lastFrameNoRef = useRef(-1);

  // Stable key — `codes` is typically a literal array recreated every
  // render by the caller (`gauges.map(...)`).
  const codesKey = codes.join(',');
  const [feed, setFeed] = useState<GlobalMetricsFeed>(() => emptyFeed(codesKey ? codesKey.split(',') : []));

  // Builds the published feed from the store's *current* state plus the
  // ref-held history/baseline — called only from the effect below (mount,
  // and every store update), never from render itself.
  const computeFeed = useCallback((): GlobalMetricsFeed => {
    const state = store.getState();
    const frame = state.sim.frame;
    const index = buildGlobalMetricIndex(state.sim.metricKeys);
    const metrics: Record<string, GlobalMetricState> = {};
    for (const code of codesKey ? codesKey.split(',') : []) {
      metrics[code] = {
        value: readGlobalMetric(frame, index, code),
        baseline: baselinesRef.current.get(code),
        history: historiesRef.current.get(code) ?? [],
      };
    }
    return { t: frame?.t ?? 0, metrics, watches: state.sim.watches };
  }, [store, codesKey]);

  useEffect(() => {
    const list = codesKey ? codesKey.split(',') : [];
    // No eager `setFeed` here (a synchronous `setState` in an effect body
    // cascades a second render for no benefit): the next frame — normally
    // ≤100ms away at the worker's 10Hz cadence — republishes the feed for
    // any new `codes`/store anyway, so this only (re)synchronizes going
    // forward, exactly what a subscription effect should do.
    return store.subscribe(() => {
      const state = store.getState();
      const frame = state.sim.frame;
      // Fires on every store change, not only a new frame (mode/selection/
      // etc. all go through the same `setState`) — skip anything that
      // isn't actually a new frame so history never gets a duplicate
      // sample at the same `t`.
      if (!frame || state.sim.frameNo === lastFrameNoRef.current) return;
      lastFrameNoRef.current = state.sim.frameNo;

      // A restart (Reset, or a scrub backward past the last-seen time):
      // start every history and baseline over instead of reading the old
      // run's tail as a continuation of the new one.
      if (frame.t < maxTRef.current - RESTART_EPSILON_SEC) {
        historiesRef.current.clear();
        baselinesRef.current.clear();
        maxTRef.current = frame.t; // otherwise every frame until t climbs back past the old max would misread as another restart
      } else {
        maxTRef.current = Math.max(maxTRef.current, frame.t);
      }

      const index = buildGlobalMetricIndex(state.sim.metricKeys);
      for (const code of list) {
        const v = readGlobalMetric(frame, index, code);
        if (v === undefined) continue;
        if (!baselinesRef.current.has(code)) baselinesRef.current.set(code, v);
        let hist = historiesRef.current.get(code);
        if (!hist) {
          hist = [];
          historiesRef.current.set(code, hist);
        }
        // Paused: the worker can keep posting frames at its own cadence for
        // reasons unrelated to sim time (health heartbeats, a hidden-tab
        // resume, …) with `t` unchanged from the last one — pushing another
        // sample at that same `t` wouldn't move the displayed value, only
        // pad the sparkline's own "view as table" row list forever.
        if (hist.length === 0 || hist[hist.length - 1].t !== frame.t) {
          hist.push({ t: frame.t, v });
        } else {
          hist[hist.length - 1] = { t: frame.t, v };
        }
        const cutoff = frame.t - HISTORY_WINDOW_SEC;
        while (hist.length > 1 && hist[0].t < cutoff) hist.shift();
      }
      setFeed(computeFeed());
    });
  }, [store, codesKey, computeFeed]);

  return feed;
}
