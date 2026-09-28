'use client';

/**
 * Break It's command surface: every fault, fix, undo and reset goes through
 * here, and from here through the worker bridge's own `applyAction` /
 * `reset` / `replay` — the worker stamps each action at a tick boundary and
 * echoes it into the store's action log, which is what every view of "what's
 * broken" reads. No bridge yet (still loading, no simulation) means every
 * command is a quiet no-op.
 */
import { useCallback, useMemo } from 'react';
import { toast } from '@/app/(components)/ui';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { PlayerStore } from '../store/playerStore';
import { getBridge } from '../worker/bridgeRegistry';
import { buildGlobalMetricIndex, readGlobalMetric } from '../metrics/globalMetrics';
import { breakUiFor, type MetricSnapshot } from './breakStore';
import { describeAction, deriveFaults, fixEntryIndex, undoPlan, withoutEntry, type BreakTool, type TargetCatalog } from './tools';
import { activeBreaks } from './pack';
import { nodeMetricKey } from '../metricKeys';
import type { KitView, RemedyView, SwitchView, UserAction } from '../types';

const SNAPSHOT_CODES = ['e', 'f', 'q', 'm'] as const;

/** The current global readings (p99, error rate, throughput, cost), plus each node key in `nodeKeys` (a cache failure's own readings). */
export function readSnapshot(store: PlayerStore, nodeKeys: readonly string[] = []): MetricSnapshot {
  const s = store.getState().sim;
  const index = buildGlobalMetricIndex(s.metricKeys);
  const out: MetricSnapshot = {};
  for (const code of SNAPSHOT_CODES) {
    const v = readGlobalMetric(s.frame, index, code);
    if (v !== undefined) out[code] = v;
  }
  if (nodeKeys.length && s.frame) {
    const nodes: Record<string, number> = {};
    for (const key of nodeKeys) {
      const i = s.metricKeys.indexOf(key);
      const v = i >= 0 ? s.frame.metrics[i] : undefined;
      if (v !== undefined && !Number.isNaN(v)) nodes[key] = v;
    }
    out.nodes = nodes;
  }
  return out;
}

/** The node readings that show the current cache failures a fix fits (none when it fits none). */
export function fixSeriesKeys(actions: readonly UserAction[], kit: KitView | undefined, fixId: string): string[] {
  const keys: string[] = [];
  for (const a of activeBreaks(actions, kit)) {
    if (!a.brk.fits.includes(fixId)) continue;
    for (const code of a.brk.series) {
      const key = nodeMetricKey(a.pack.el, code);
      if (!keys.includes(key)) keys.push(key);
    }
  }
  if (keys.length === 0) {
    const killed = deriveFaults(actions).killed;
    for (const p of kit?.packs ?? []) if (killed.has(p.el) && p.down.includes(fixId)) keys.push(nodeMetricKey(p.el, 'j'), nodeMetricKey(p.el, 'v'));
  }
  return keys;
}

export interface BreakCommandsContext {
  catalog: TargetCatalog;
  remedies: readonly RemedyView[];
  switches?: readonly SwitchView[];
  kit?: KitView;
}

export interface BreakCommands {
  /** Sends one fault (or its inverse). Returns false when there's no running simulation to take it. */
  apply(tool: BreakTool | 'restore' | 'heal' | 'fault', target: string | null, value?: number | null): boolean;
  applyFix(id: string): boolean;
  revertFix(id: string): boolean;
  /** Takes one logged action back (see `undoPlan`). */
  undo(index: number): boolean;
  /** Back to the healthy start, running. */
  reset(): void;
}

function ready(store: PlayerStore) {
  const bridge = getBridge(store);
  return bridge && store.getState().sim.status === 'ready' ? bridge : null;
}

export function useBreakCommands({ catalog, remedies, switches, kit }: BreakCommandsContext): BreakCommands {
  const store = usePlayerStoreApi();

  const say = useCallback(
    (action: UserAction) => {
      toast(describeAction(action, catalog, remedies, switches, kit));
    },
    [catalog, remedies, switches, kit],
  );

  const apply = useCallback(
    (tool: string, target: string | null, value: number | null = null): boolean => {
      const bridge = ready(store);
      if (!bridge) return false;
      bridge.applyAction(tool, target, value);
      // A fault on a paused run would show nothing; the design resumes play on every move.
      if (!store.getState().sim.playing) bridge.play();
      breakUiFor(store).set({ armed: null, spikeOpen: false, cacheOpen: false });
      say([0, tool, target, value]);
      return true;
    },
    [store, say],
  );

  const applyFix = useCallback(
    (id: string): boolean => {
      const before = readSnapshot(store, fixSeriesKeys(store.getState().actions, kit, id));
      const t = store.getState().sim.frame?.t ?? 0;
      if (!apply('intervention', id, null)) return false;
      breakUiFor(store).set((s) => ({ marks: { ...s.marks, [id]: { t, before } } }));
      return true;
    },
    [store, apply, kit],
  );

  const replayWithout = useCallback(
    (index: number): boolean => {
      const bridge = ready(store);
      if (!bridge) return false;
      const state = store.getState();
      const action = state.actions[index];
      if (!action) return false;
      bridge.replay(withoutEntry(state.actions, index), state.sim.frame?.t ?? 0);
      if (action[1] === 'intervention' && action[2]) {
        const fixId = action[2];
        breakUiFor(store).set((s) => {
          const marks = { ...s.marks };
          delete marks[fixId];
          return { marks };
        });
        const text = remedies.find((r) => r.id === fixId)?.text ?? fixId;
        toast(`Removed: ${text}`);
      } else if (action[1] === 'fault' || action[1] === 'calc') {
        toast(`Undone: ${describeAction(action, catalog, remedies, switches, kit)}`);
      }
      return true;
    },
    [store, remedies, catalog, switches, kit],
  );

  const revertFix = useCallback(
    (id: string): boolean => {
      const index = fixEntryIndex(store.getState().actions, id);
      return index >= 0 ? replayWithout(index) : false;
    },
    [store, replayWithout],
  );

  const undo = useCallback(
    (index: number): boolean => {
      const plan = undoPlan(store.getState().actions, index);
      if (!plan) return false;
      if (plan.kind === 'replay') return replayWithout(plan.index);
      return apply(plan.tool, plan.target, plan.value);
    },
    [store, apply, replayWithout],
  );

  const reset = useCallback(() => {
    const bridge = getBridge(store);
    if (!bridge) return;
    bridge.reset();
    bridge.play();
    breakUiFor(store).set({ armed: null, spikeOpen: false, cacheOpen: false, marks: {} });
    toast('Reset: healthy, baseline load');
  }, [store]);

  return useMemo(
    () => ({ apply: apply as BreakCommands['apply'], applyFix, revertFix, undo, reset }),
    [apply, applyFix, revertFix, undo, reset],
  );
}
