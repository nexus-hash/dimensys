/**
 * Gauge → data-display-kit mapping (T3.8).
 *
 * `GaugeView` (`types.ts`) carries the view's own words for a tile's unit
 * (`suffix`, e.g. `"ms"`, `"%"`, `"rps"`, `"$/mo"`) and the metric's neutral
 * code (`probe`, parsed by `globalMetrics.ts`). The data-display kit
 * (`app/(components)/data`, DS6) already has the formatters and threshold
 * table for exactly this vocabulary (`MetricUnit`, `ThresholdMetricKind`) —
 * this module is the one seam translating between the two, so the HUD
 * doesn't carry its own copy of either.
 */
import type { MetricUnit, ThresholdMetricKind } from '@/app/(components)/data';

/** `GaugeView.suffix` → the kit's `MetricUnit`. Unrecognized suffixes fall back to a bare count. */
export function unitForSuffix(suffix: string): MetricUnit {
  switch (suffix) {
    case 'ms':
      return 'ms';
    case 's':
      return 's';
    case '%':
      return '%';
    case 'rps':
      return 'rps';
    case '$/mo':
      return 'usd-mo';
    default:
      return 'count';
  }
}

/**
 * Metric code (`metricKeys.ts`) → the kit's `ThresholdMetricKind`, for
 * gauges whose code has a known severity table. `d` (mean latency) and `r`
 * (p50) share the p99 table — the kit has no separate cutoffs for them and
 * a slower percentile crossing the same line is at least as meaningful.
 * `undefined` (throughput, cost, availability, …) means this code never
 * rings a tile — cost/throughput-style gauges stay neutral.
 */
const CODE_TO_KIND: Readonly<Record<string, ThresholdMetricKind>> = {
  d: 'p99',
  e: 'p99',
  r: 'p99',
  f: 'err',
  c: 'util',
  k: 'lag',
};

export function thresholdKindForCode(code: string): ThresholdMetricKind | undefined {
  return CODE_TO_KIND[code];
}
