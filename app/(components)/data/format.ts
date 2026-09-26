/**
 * Unit formatting + threshold helpers for the data-display kit (§8).
 *
 * The numeric formatting mirrors the prototype's `fmtMs`/`fmtPct`/`fmtRps`/
 * `fmtUsd` (prototype/index.html) exactly, so the HUD reads identically to
 * the approved visual contract. Every formatter returns the em dash `'—'`
 * for missing/non-finite input, so gaps in streamed data (NaN samples, a
 * metric that hasn't reported yet) render as a dash rather than "NaN" or
 * "undefined".
 *
 * These return bare numeric strings (no unit suffix) — §3.2's mono-metric
 * style puts the unit in a separate, smaller `<small>` beside the value
 * (see `StatTile`). Use `metricUnitLabel` for that suffix, or `formatMetric`
 * for a single combined "value unit" string (aria-labels, table cells).
 */

const nf = new Intl.NumberFormat('en-US');

function isUsable(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

/** Latency in milliseconds. Sub-10ms keeps one decimal; otherwise grouped integer. */
export function formatMs(value: number | null | undefined): string {
  if (!isUsable(value)) return '—';
  return value < 10 ? value.toFixed(1) : nf.format(Math.round(value));
}

/** Latency/duration in seconds. Sub-10s keeps two decimals, else one. */
export function formatSeconds(value: number | null | undefined): string {
  if (!isUsable(value)) return '—';
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
}

/**
 * A 0–1 ratio as a percent. `decimals` (default 1) is dropped once the value
 * reads at 10%+ with a requested precision above 1, and integers are shown
 * with no decimal once the value rounds to 100%+ — matches the prototype's
 * `fmtPct`, used for both small error rates (e.g. "0.42") and big ones.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (!isUsable(value)) return '—';
  const p = value * 100;
  if (p >= 100) return nf.format(Math.round(p));
  return p.toFixed(p >= 10 && decimals < 2 ? (decimals === 0 ? 0 : 1) : decimals);
}

/** Requests/sec, compacted with a k/M suffix above 1,000 / 1,000,000. */
export function formatRps(value: number | null | undefined): string {
  if (!isUsable(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

/** US dollars, grouped and rounded to the nearest whole dollar (`$2,161`). */
export function formatUsd(value: number | null | undefined): string {
  if (!isUsable(value)) return '—';
  return `$${nf.format(Math.round(value))}`;
}

export type MetricUnit = 'ms' | 's' | '%' | 'rps' | 'usd-mo' | 'count';

/** The small unit label rendered beside a formatted value (§3.2 mono-sm). */
export function metricUnitLabel(unit: MetricUnit): string {
  switch (unit) {
    case 'ms':
      return 'ms';
    case 's':
      return 's';
    case '%':
      return '%';
    case 'rps':
      return 'rps';
    case 'usd-mo':
      return '/mo';
    case 'count':
      return '';
  }
}

/** Formats the bare value for a given unit (no suffix — see `metricUnitLabel`). */
export function formatMetricValue(value: number | null | undefined, unit: MetricUnit, decimals?: number): string {
  switch (unit) {
    case 'ms':
      return formatMs(value);
    case 's':
      return formatSeconds(value);
    case '%':
      return formatPercent(value, decimals);
    case 'rps':
      return formatRps(value);
    case 'usd-mo':
      return formatUsd(value);
    case 'count':
      return isUsable(value) ? nf.format(Math.round(value)) : '—';
  }
}

/** A single combined "value unit" string, for aria-labels and table cells. */
export function formatMetric(value: number | null | undefined, unit: MetricUnit, decimals?: number): string {
  const v = formatMetricValue(value, unit, decimals);
  const u = metricUnitLabel(unit);
  if (v === '—' || !u) return v;
  return `${v} ${u}`;
}

/** Severity states a threshold-driven metric can be in (§5.3/§8: never color alone). */
export type Severity = 0 | 1 | 2;

/** The prototype's `HEALTH` thresholds (§5.3), `[warnAt, criticalAt]` per metric kind. */
export const HEALTH_THRESHOLDS = {
  util: [0.7, 0.9],
  err: [0.01, 0.05],
  p99: [500, 2000],
  lag: [10, 60],
} as const satisfies Record<string, readonly [number, number]>;

export type ThresholdMetricKind = keyof typeof HEALTH_THRESHOLDS;

/** 0 = ok, 1 = warn, 2 = critical, matching the prototype's `sevOf`. */
export function severityOf(kind: ThresholdMetricKind, value: number | null | undefined): Severity {
  const t = HEALTH_THRESHOLDS[kind];
  if (!isUsable(value)) return 0;
  return value >= t[1] ? 2 : value >= t[0] ? 1 : 0;
}

/** Severity from explicit warn/critical thresholds (for a `Meter`'s own scale). */
export function severityFromThresholds(
  value: number | null | undefined,
  warnAt: number | undefined,
  criticalAt: number | undefined,
): Severity {
  if (!isUsable(value)) return 0;
  if (criticalAt != null && value >= criticalAt) return 2;
  if (warnAt != null && value >= warnAt) return 1;
  return 0;
}
