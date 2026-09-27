'use client';

/**
 * HUD stat tiles (T3.8): up to 4 tiles from `ViewData.gauges`, rendered with
 * the data-display kit's own `StatTile` (`app/(components)/data`, DS6) —
 * label, big mono value + unit, delta-vs-baseline and a 60s sparkline, all
 * built there already. This file is only the live-data seam: it reads the
 * one shared metrics feed (`useGlobalMetricsFeed`) and translates a gauge's
 * neutral probe/suffix into `StatTile`'s props (`gaugeUnits.ts`,
 * `tileDelta.ts`) — no HUD-specific formatting or thresholds are
 * reimplemented here.
 */
import { StatTile, formatMetricValue, metricUnitLabel, severityOf, warnThresholdOf } from '@/app/(components)/data';
import { gaugeCode } from '../metrics/globalMetrics';
import { unitForSuffix, thresholdKindForCode } from '../metrics/gaugeUnits';
import { tileDelta } from '../metrics/tileDelta';
import { useGlobalMetricsFeed } from '../metrics/useGlobalMetricsFeed';
import { SNAPSHOT_HZ } from '../worker/protocol';
import type { GaugeView } from '../types';

export interface HudTilesProps {
  /** Capped to 4 — the spec's tile budget; a 5th+ gauge is simply not shown. */
  gauges: readonly GaugeView[];
}

const MAX_TILES = 4;
const HISTORY_WINDOW_SEC = 60;
/** Sparkline slot budget: samples arrive at the worker's own frame cadence. */
const SPARK_WINDOW = HISTORY_WINDOW_SEC * SNAPSHOT_HZ;

export function HudTiles({ gauges }: HudTilesProps) {
  const shown = gauges.slice(0, MAX_TILES);
  const codes = shown.map((g) => gaugeCode(g.probe)).filter((c): c is string => c !== null);
  const feed = useGlobalMetricsFeed(codes);

  if (shown.length === 0) return null;

  return (
    <>
      {shown.map((gauge) => {
        const code = gaugeCode(gauge.probe);
        const m = code ? feed.metrics[code] : undefined;
        const value = m?.value;
        const unit = unitForSuffix(gauge.suffix);
        const kind = code ? thresholdKindForCode(code) : undefined;
        const severity = kind ? severityOf(kind, value) : 0;

        return (
          <StatTile
            key={gauge.probe}
            className="hud-tile"
            label={gauge.text}
            value={formatMetricValue(value, unit)}
            unit={metricUnitLabel(unit) || gauge.suffix}
            severity={severity}
            delta={code ? tileDelta(code, value, m?.baseline) : undefined}
            sparkline={{
              values: (m?.history ?? []).map((s) => s.v),
              window: SPARK_WINDOW,
              warnThreshold: kind ? warnThresholdOf(kind) : undefined,
              unit: metricUnitLabel(unit) || gauge.suffix,
              formatValue: (v) => formatMetricValue(v, unit),
            }}
          />
        );
      })}
    </>
  );
}
