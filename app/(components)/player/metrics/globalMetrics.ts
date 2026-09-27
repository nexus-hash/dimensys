/**
 * Global-metric column lookup (T3.8): the HUD tiles and requirement badges
 * only ever read `g.<code>` columns (see `GaugeView.probe` /
 * `NeedView.alarm` in `types.ts`), never per-node/link ones — that's
 * `overlay/metricIndex.ts`'s job, and it doesn't index the global scope at
 * all (nothing under T3.3/T3.6 needed it). This is the same idea, narrowed
 * to `g.*`, so a global read is one array index instead of a per-frame
 * linear scan.
 */
import type { SimFrame } from '../store/playerStore';
import { parseMetricKey } from '../metricKeys';

/** `code -> column index into frame.metrics`, built once per `keysEpoch`. */
export type GlobalMetricIndex = ReadonlyMap<string, number>;

export function buildGlobalMetricIndex(metricKeys: readonly string[]): GlobalMetricIndex {
  const cols = new Map<string, number>();
  metricKeys.forEach((key, i) => {
    const parsed = parseMetricKey(key);
    if (parsed && parsed.scope === 'g') cols.set(parsed.code, i);
  });
  return cols;
}

/** Reads one global metric column, or `undefined` if this build doesn't publish it (or the frame has no reading yet). */
export function readGlobalMetric(frame: SimFrame | null, index: GlobalMetricIndex, code: string): number | undefined {
  if (!frame) return undefined;
  const i = index.get(code);
  if (i === undefined) return undefined;
  const v = frame.metrics[i];
  return Number.isNaN(v) ? undefined : v;
}

/** Parses a `GaugeView.probe` (e.g. `"g.e"`) down to its bare code (`"e"`), or `null` for a probe this module doesn't understand (a per-node/link gauge — none exist today, but the type allows it; such a gauge just never lights up). */
export function gaugeCode(probe: string): string | null {
  const parsed = parseMetricKey(probe);
  return parsed && parsed.scope === 'g' ? parsed.code : null;
}
