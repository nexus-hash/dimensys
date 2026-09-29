'use client';

import { useMemo } from 'react';
import {
  StatTile,
  TableView,
  formatMetricValue,
  metricUnitLabel,
  severityOf,
  warnThresholdOf,
  type MetricUnit,
} from '@/app/(components)/data';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { metricCodeLabel, metricCodeUnit, nodeMetricKey } from '../metricKeys';
import { thresholdKindForCode } from '../metrics/gaugeUnits';
import { fmtSimTime } from '../metrics/simTime';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import type { MetricSample } from '../metrics/useGlobalMetricsFeed';
import type { SparkPart } from '../types';
import { SectionHeading } from './SectionHeading';

/** Sparkline resolution: one point per half second, like the HUD's tiles. */
const POINTS_PER_SEC = 2;
const DEFAULT_SPAN_SEC = 60;

/** The data kit's unit for a metric code's own unit word; words it has no formatter for read as a plain count with that word as the suffix. */
function unitKind(code: string): { kind: MetricUnit; suffix: string } {
  const unit = metricCodeUnit(code);
  switch (unit) {
    case 'ratio':
      return { kind: '%', suffix: '%' };
    case 'ms':
      return { kind: 'ms', suffix: 'ms' };
    case 'rps':
      return { kind: 'rps', suffix: 'rps' };
    case '$/mo':
      return { kind: 'usd-mo', suffix: metricUnitLabel('usd-mo') };
    case 'count':
    case '':
      return { kind: 'count', suffix: '' };
    default:
      return { kind: 'count', suffix: unit };
  }
}

/** The last sample of every `1 / perSec` second bucket, oldest first. */
export function bucketSamples(history: readonly MetricSample[], perSec: number): MetricSample[] {
  const out: MetricSample[] = [];
  let lastBucket = Number.NaN;
  for (const s of history) {
    const bucket = Math.floor(s.t * perSec);
    if (bucket === lastBucket) out[out.length - 1] = s;
    else out.push(s);
    lastBucket = bucket;
  }
  return out;
}

interface SeriesReading {
  code: string;
  label: string;
  value: string;
  suffix: string;
  severity: 0 | 1 | 2;
  warnThreshold: number | undefined;
  points: number[];
  format: (v: number) => string;
  /** One sample per second, for the table. */
  perSecond: MetricSample[];
}

/**
 * Live sparklines of one node's own metrics over the last minute of
 * simulated time: a compact stat tile per metric (value, severity ring and
 * glyph, sparkline), plus one "View as table" for all of them — the
 * accessible alternative to the charts, one row per second, newest first.
 */
export function SparkPanel({ part, elementId }: { part: SparkPart; elementId: string }) {
  const status = usePlayerStore((s) => s.sim.status);
  const span = part.span ?? DEFAULT_SPAN_SEC;
  const keys = useMemo(() => part.series.map((code) => nodeMetricKey(elementId, code)), [part.series, elementId]);
  const feed = useMetricSeriesFeed(keys, span);

  const readings: SeriesReading[] = part.series.map((code, i) => {
    const series = feed.series[keys[i]];
    const { kind, suffix } = unitKind(code);
    const threshold = thresholdKindForCode(code);
    const history = series?.history ?? [];
    return {
      code,
      label: metricCodeLabel(code),
      value: formatMetricValue(series?.value, kind),
      suffix,
      severity: threshold ? severityOf(threshold, series?.value) : 0,
      warnThreshold: threshold ? warnThresholdOf(threshold) : undefined,
      points: bucketSamples(history, POINTS_PER_SEC).map((s) => s.v),
      format: (v: number) => formatMetricValue(v, kind),
      perSecond: bucketSamples(history, 1),
    };
  });

  // Table rows: one per second across every series, newest first.
  const times = new Set<number>();
  for (const r of readings) for (const s of r.perSecond) times.add(Math.floor(s.t));
  const rows = [...times]
    .sort((a, b) => b - a)
    .map((t) => [
      fmtSimTime(t),
      ...readings.map((r) => {
        const s = r.perSecond.find((p) => Math.floor(p.t) === t);
        return s ? r.format(s.v) : '—';
      }),
    ]);

  const note =
    status === 'unavailable' || status === 'error'
      ? 'Live metrics need the simulation, which this view does not have.'
      : status !== 'ready'
        ? 'Waiting for the simulation…'
        : null;

  return (
    <section className="min-w-0" data-inspector-spark={elementId}>
      <SectionHeading title={part.title} assumed={part.assumed}>
        <span className="font-mono text-mono-sm text-ink-muted">last {span} s</span>
      </SectionHeading>
      <div className="grid grid-cols-2 gap-2">
        {readings.map((r) => (
          <StatTile
            key={r.code}
            variant="compact"
            className="max-w-none"
            label={r.label}
            value={r.value}
            unit={r.suffix || undefined}
            severity={r.severity}
            sparkline={{
              values: r.points,
              warnThreshold: r.warnThreshold,
              unit: r.suffix,
              formatValue: r.format,
              title: `${r.label}, last ${span} s, now ${r.value}${r.suffix ? ` ${r.suffix}` : ''}`,
            }}
          />
        ))}
      </div>
      {note ? <p className="mt-2 text-caption text-ink-muted">{note}</p> : null}
      <TableView
        caption={`${part.title}: ${readings.map((r) => r.label).join(', ')}, one row per second, newest first`}
        columns={['t', ...readings.map((r) => (r.suffix ? `${r.label} (${r.suffix})` : r.label))]}
        rows={rows}
      />
    </section>
  );
}
