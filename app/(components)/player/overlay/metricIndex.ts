/**
 * Column lookups over one frame's `metricKeys`/`healthIds` (T3.3). Built once
 * per `keysEpoch` (they only change when the node/link set does — a patch,
 * a fix applied, a spare going live) and reused across every 10 Hz frame, so
 * the frame → DOM/particle update loop does no string parsing per tick.
 */
import { parseMetricKey } from '../metricKeys';

export interface MetricIndex {
  keysEpoch: number;
  /** `nodeId -> { [code]: column index into frame.metrics }`. */
  nodeCols: ReadonlyMap<string, ReadonlyMap<string, number>>;
  linkCols: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** `id -> row index into frame.health` (nodes, links and flows share one id space there). */
  healthRow: ReadonlyMap<string, number>;
}

export function buildMetricIndex(keysEpoch: number, metricKeys: readonly string[], healthIds: readonly string[]): MetricIndex {
  const nodeCols = new Map<string, Map<string, number>>();
  const linkCols = new Map<string, Map<string, number>>();

  metricKeys.forEach((key, i) => {
    const parsed = parseMetricKey(key);
    if (!parsed || parsed.id === null) return;
    const target = parsed.scope === 'n' ? nodeCols : parsed.scope === 'l' ? linkCols : null;
    if (!target) return;
    let cols = target.get(parsed.id);
    if (!cols) {
      cols = new Map();
      target.set(parsed.id, cols);
    }
    cols.set(parsed.code, i);
  });

  const healthRow = new Map<string, number>();
  healthIds.forEach((id, i) => healthRow.set(id, i));

  return { keysEpoch, nodeCols, linkCols, healthRow };
}

/** Reads one metric column for an id, or `undefined` if that id/code isn't published this epoch. */
export function readMetric(
  cols: ReadonlyMap<string, ReadonlyMap<string, number>>,
  metrics: Float64Array,
  id: string,
  code: string,
): number | undefined {
  const i = cols.get(id)?.get(code);
  if (i === undefined) return undefined;
  const v = metrics[i];
  return Number.isNaN(v) ? undefined : v;
}
