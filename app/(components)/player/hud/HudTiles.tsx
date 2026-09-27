'use client';

/**
 * HUD stat tiles (T3.8): up to 4 tiles from `ViewData.gauges`, rendered with
 * the data-display kit's own `StatTile` in its `compact` variant (label over
 * value on the left, delta over a 20px sparkline on the right). This file is
 * only the live-data seam: it reads the one shared metrics feed
 * (`useGlobalMetricsFeed`) and translates a gauge's neutral probe/suffix
 * into `StatTile`'s props (`gaugeUnits.ts`, `tileDelta.ts`) — no
 * HUD-specific formatting or thresholds are reimplemented here.
 *
 * `useHudReadings` is split out so one strip can feed the tiles, the phone
 * summary button and the screen-reader table from a single subscription.
 */
import type { ReactNode } from 'react';
import {
  StatTile,
  formatMetricValue,
  metricUnitLabel,
  severityOf,
  warnThresholdOf,
  type Severity,
  type StatTileDelta,
} from '@/app/(components)/data';
import { HealthGlyph } from '@/app/(components)/canvas';
import { ChevronDownIcon } from '@/app/(components)/ui';
import { gaugeCode } from '../metrics/globalMetrics';
import { unitForSuffix, thresholdKindForCode } from '../metrics/gaugeUnits';
import { tileDelta } from '../metrics/tileDelta';
import { useGlobalMetricsFeed, type MetricSample } from '../metrics/useGlobalMetricsFeed';
import type { GaugeView } from '../types';

const MAX_TILES = 4;
/** Sparkline resolution: one point per half second of simulated time (120 points across the 60 s window). */
const SPARK_BUCKETS_PER_SEC = 2;

/** Short names for the phone summary button, e.g. "p99 20 ms · err 0.00%". Unknown codes fall back to the gauge's own label. */
const SHORT_LABEL: Readonly<Record<string, string>> = {
  e: 'p99',
  d: 'mean',
  r: 'p50',
  f: 'err',
  q: 'thr',
  n: 'rps',
  p: 'ok rps',
  m: 'cost',
  c: 'util',
  s: 'avail',
};

export interface HudReading {
  key: string;
  label: string;
  shortLabel: string;
  /** Formatted current value (`—` before the first frame). */
  value: string;
  unit: string;
  severity: Severity;
  delta: StatTileDelta | undefined;
  warnThreshold: number | undefined;
  /** Sparkline points, oldest first, one per half second. */
  spark: number[];
  /** Formatted 60 s low / high, for the table. */
  low: string;
  high: string;
  format: (v: number) => string;
}

/** Last sample of every half-second bucket: enough resolution for a 20px-tall line, a fraction of the per-frame point count. */
function downsample(history: readonly MetricSample[]): number[] {
  const out: number[] = [];
  let lastBucket = Number.NaN;
  for (const s of history) {
    const bucket = Math.floor(s.t * SPARK_BUCKETS_PER_SEC);
    if (bucket === lastBucket) out[out.length - 1] = s.v;
    else out.push(s.v);
    lastBucket = bucket;
  }
  return out;
}

export function useHudReadings(gauges: readonly GaugeView[]): HudReading[] {
  const shown = gauges.slice(0, MAX_TILES);
  const codes = shown.map((g) => gaugeCode(g.probe)).filter((c): c is string => c !== null);
  const feed = useGlobalMetricsFeed(codes);

  return shown.map((gauge) => {
    const code = gaugeCode(gauge.probe);
    const m = code ? feed.metrics[code] : undefined;
    const value = m?.value;
    const unitKind = unitForSuffix(gauge.suffix);
    const kind = code ? thresholdKindForCode(code) : undefined;
    const format = (v: number) => formatMetricValue(v, unitKind);
    const history = m?.history ?? [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of history) {
      if (s.v < lo) lo = s.v;
      if (s.v > hi) hi = s.v;
    }
    return {
      key: gauge.probe,
      label: gauge.text,
      shortLabel: (code && SHORT_LABEL[code]) || gauge.text,
      value: formatMetricValue(value, unitKind),
      unit: metricUnitLabel(unitKind) || gauge.suffix,
      severity: kind ? severityOf(kind, value) : 0,
      delta: code ? tileDelta(code, value, m?.baseline) : undefined,
      warnThreshold: kind ? warnThresholdOf(kind) : undefined,
      spark: downsample(history),
      low: history.length ? format(lo) : '—',
      high: history.length ? format(hi) : '—',
      format,
    };
  });
}

export function HudTileRow({ readings }: { readings: readonly HudReading[] }) {
  return (
    <>
      {readings.map((r) => (
        <StatTile
          key={r.key}
          variant="compact"
          className="hud-tile"
          label={r.label}
          value={r.value}
          unit={r.unit}
          severity={r.severity}
          delta={r.delta}
          sparkline={{
            // Until a full minute has elapsed the line spans the tile's
            // whole width (it stretches over the history there is), so a
            // fresh run shows a line straight away rather than a dot at the
            // right edge; after that it rolls.
            values: r.spark,
            warnThreshold: r.warnThreshold,
            unit: r.unit,
            formatValue: r.format,
            title: `${r.label}, last 60 s, now ${r.value}${r.unit ? ` ${r.unit}` : ''}`,
          }}
        />
      ))}
    </>
  );
}

/** Tiles for a standalone container (the phone sheet's Metrics tab), with their own feed subscription. */
export function HudTiles({ gauges }: { gauges: readonly GaugeView[] }) {
  const readings = useHudReadings(gauges);
  if (readings.length === 0) return null;
  return <HudTileRow readings={readings} />;
}

function withUnit(value: string, unit: string): string {
  if (value === '—' || !unit) return value;
  return unit.startsWith('/') || unit === '%' ? `${value}${unit}` : `${value} ${unit}`;
}

/**
 * The one table alternative for the whole HUD: every tile's current value,
 * delta and 60 s range, visually hidden (the tiles already show the same
 * numbers on screen; this gives assistive tech the rows the sparklines draw).
 */
export function HudTable({ readings }: { readings: readonly HudReading[] }) {
  if (readings.length === 0) return null;
  return (
    <table className="sr-only">
      <caption>Live metrics, last 60 seconds</caption>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">Now</th>
          <th scope="col">Versus baseline</th>
          <th scope="col">60 s low</th>
          <th scope="col">60 s high</th>
        </tr>
      </thead>
      <tbody>
        {readings.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.label}</th>
            <td>{withUnit(r.value, r.unit)}</td>
            <td>{r.delta ? `${r.delta.direction === 1 ? 'up ' : r.delta.direction === -1 ? 'down ' : ''}${r.delta.text}` : '—'}</td>
            <td>{withUnit(r.low, r.unit)}</td>
            <td>{withUnit(r.high, r.unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface HudSummaryProps {
  readings: readonly HudReading[];
  expanded: boolean;
  onToggle: () => void;
  /** Id of the tile group this button shows and hides. */
  controls: string;
}

/**
 * Phone: the HUD collapses to one summary button showing the first two
 * tiles ("p99 20 ms · err 0.00%"); tapping it expands the full tiles into a
 * 2×2 grid under it. Hidden above the phone breakpoint by CSS.
 */
export function HudSummary({ readings, expanded, onToggle, controls }: HudSummaryProps) {
  if (readings.length === 0) return null;
  const parts: ReactNode[] = [];
  readings.slice(0, 2).forEach((r, i) => {
    if (i > 0) {
      parts.push(
        <span key={`sep-${r.key}`} className="text-ink-muted" aria-hidden="true">
          ·
        </span>,
      );
    }
    parts.push(
      <span key={r.key} className="inline-flex items-center gap-1.5">
        {r.severity > 0 ? (
          <HealthGlyph state={r.severity === 2 ? 'critical' : 'warn'} size={14} ariaLabel={r.severity === 2 ? 'critical' : 'warning'} />
        ) : null}
        <span>{`${r.shortLabel} ${withUnit(r.value, r.unit)}`}</span>
      </span>,
    );
  });
  return (
    <button type="button" className="player-hud-summary" aria-expanded={expanded} aria-controls={controls} onClick={onToggle}>
      <span className="sr-only">Live metrics: </span>
      {parts}
      <ChevronDownIcon className="player-hud-summary-chev" aria-hidden="true" />
    </button>
  );
}
