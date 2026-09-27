/**
 * Neutral metric keys (format 2): the only shape this app knows about live
 * metrics. Every value the runtime worker publishes — `frame.metrics`
 * columns, `GaugeView.probe`, `social.probes[]` — is addressed by one of
 * these forms:
 *
 *   n:<nodeId>.<code>   a per-node metric
 *   l:<linkId>.<code>   a per-link metric
 *   f:<flowId>.<code>   a per-flow metric
 *   g.<code>            a global (whole-diagram) metric
 *
 * `<code>` is one fixed single letter per metric, the same letter in every
 * scope. No key names a field or metric the way the engine's own source
 * does; the letters are an opaque, publicly documented code table. This
 * module is the one place that splits a key into its parts and maps a code
 * to a human label/unit for the HUD — nothing else in the app should do
 * either of those things by hand.
 *
 * `SparkPart.series[]` (see `types.ts`) holds bare codes, not full keys: the
 * sparkline column for a given part's own node is `nodeMetricKey(nodeId,
 * code)`.
 */

export type MetricScope = 'n' | 'l' | 'f' | 'g';

export interface ParsedMetricKey {
  scope: MetricScope;
  /** Element id the metric belongs to; `null` for a global (`g.<code>`) metric. */
  id: string | null;
  code: string;
}

const SCOPED_RE = /^([nlf]):(.+)$/;

/**
 * Splits a neutral metric key into its scope, element id and code. `null`
 * for anything else (including the old `node:<id>.<metric>` /
 * `global.<metric>` forms, which this app no longer understands).
 *
 * The code is split off at the *last* `.`, not the first: an element id may
 * itself contain dots (e.g. a nested-subsystem id), but a code never does.
 */
export function parseMetricKey(key: string): ParsedMetricKey | null {
  if (key.startsWith('g.')) {
    const code = key.slice(2);
    return code ? { scope: 'g', id: null, code } : null;
  }

  const scoped = SCOPED_RE.exec(key);
  if (!scoped) return null;
  const [, scope, rest] = scoped;
  const dot = rest.lastIndexOf('.');
  if (dot <= 0 || dot === rest.length - 1) return null;
  return { scope: scope as MetricScope, id: rest.slice(0, dot), code: rest.slice(dot + 1) };
}

/** Builds a per-node metric key, e.g. `nodeMetricKey('api', 'c')` → `n:api.c`. */
export function nodeMetricKey(nodeId: string, code: string): string {
  return `n:${nodeId}.${code}`;
}

/** Builds a per-link metric key. */
export function linkMetricKey(linkId: string, code: string): string {
  return `l:${linkId}.${code}`;
}

/** Builds a per-flow metric key. */
export function flowMetricKey(flowId: string, code: string): string {
  return `f:${flowId}.${code}`;
}

/** Builds a global metric key, e.g. `globalMetricKey('e')` → `g.e`. */
export function globalMetricKey(code: string): string {
  return `g.${code}`;
}

/** Code for a node's live replica count (`n:<id>.i`), used to drive replica stacks. */
export const REPLICA_CODE = 'i';

/** Code for a node's own utilization gauge (`n:<id>.c`). */
export const UTILIZATION_CODE = 'c';

interface MetricCodeInfo {
  /** Display label, e.g. "p99 latency" — UI text, not an engine field name. */
  label: string;
  /** Display unit/suffix, or `''` when the value is unitless (booleans, counts shown bare). */
  unit: string;
}

/**
 * One fixed letter per metric, the same letter in every scope. Labels here
 * are plain UI text for the HUD; they intentionally do not reuse any
 * internal field name.
 */
const METRIC_CODE_INFO: Readonly<Record<string, MetricCodeInfo>> = {
  a: { label: 'requests in', unit: 'rps' },
  b: { label: 'requests out', unit: 'rps' },
  c: { label: 'utilization', unit: 'ratio' },
  d: { label: 'mean latency', unit: 'ms' },
  e: { label: 'p99 latency', unit: 'ms' },
  f: { label: 'error rate', unit: 'ratio' },
  g: { label: 'queue depth', unit: 'msgs' },
  h: { label: 'up', unit: '' },
  i: { label: 'replicas', unit: 'count' },
  j: { label: 'hit ratio', unit: 'ratio' },
  k: { label: 'replication lag', unit: 'ms' },
  l: { label: 'connections', unit: 'count' },
  m: { label: 'cost per month', unit: '$/mo' },
  n: { label: 'requests', unit: 'rps' },
  o: { label: 'retries', unit: 'rps' },
  p: { label: 'successful requests', unit: 'rps' },
  q: { label: 'throughput', unit: 'rps' },
  r: { label: 'p50 latency', unit: 'ms' },
  s: { label: 'availability', unit: 'ratio' },
};

/** Human label for a metric code, e.g. `metricCodeLabel('e')` → `"p99 latency"`. Falls back to the bare code for one this app's copy of the table doesn't (yet) know. */
export function metricCodeLabel(code: string): string {
  return METRIC_CODE_INFO[code]?.label ?? code;
}

/** Display unit/suffix for a metric code, e.g. `metricCodeUnit('m')` → `"$/mo"`. `''` when unknown or unitless. */
export function metricCodeUnit(code: string): string {
  return METRIC_CODE_INFO[code]?.unit ?? '';
}
