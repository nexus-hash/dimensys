import { Tooltip } from '@/app/(components)/ui';
import { TableView } from './TableView';
import type { Severity } from './format';

interface SparklineProps {
  /** Samples, oldest first. `NaN`/`null`/`undefined` entries are gaps. */
  values: Array<number | null | undefined>;
  /**
   * The fixed number of slots the rolling window holds (the design spec: free play is a
   * rolling 60s window, no scrubber). Values render right-aligned into this
   * many slots, so the line's width never changes as samples stream in —
   * only `values.length < window` (still filling up) shifts what's drawn,
   * never the SVG's box. Defaults to `values.length` (no fixed window).
   */
  window?: number;
  /** Rendered height in px. Width is fluid (viewBox 0 0 100 height, `preserveAspectRatio="none"`). */
  height?: number;
  /** A dashed hairline warn threshold. */
  warnThreshold?: number;
  /** Vertical dashed marker at a slot index, e.g. a before/after boundary. */
  markIndex?: number;
  /** Colors the current-point dot; defaults to plain ink. */
  severity?: Severity;
  /** Accessible name and tooltip content, e.g. "p99 latency, last 60s, now 640 ms". */
  title: string;
  /** Column header for the value column in the table view. */
  unit?: string;
  /** Row labels for the table view (must match `values.length`, oldest first). */
  timestamps?: string[];
  /** Formats a value for the table view; defaults to `String`. */
  formatValue?: (value: number) => string;
  /**
   * Render the "view as table" disclosure under the chart (default `true`).
   * A caller that already offers one table for a whole group of charts (the
   * player's HUD strip) passes `false` so each chart doesn't repeat it.
   */
  table?: boolean;
  className?: string;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  0: 'var(--color-ink-secondary)',
  1: 'var(--color-signal-warn)',
  2: 'var(--color-signal-critical)',
};

/**
 * Sparkline: a single muted line with a subtle area fill, no axes, the
 * current point emphasized as a dot, gaps for missing samples, and a fixed
 * viewBox so the chart never reflows as data streams. Ships with a hover
 * tooltip and (unless `table={false}`) a "view as table" disclosure.
 */
export function Sparkline({
  values,
  window,
  height = 24,
  warnThreshold,
  markIndex,
  severity = 0,
  title,
  unit,
  timestamps,
  formatValue = (v) => String(v),
  table = true,
  className,
}: SparklineProps) {
  const w = 100;
  const h = height;
  const n = values.length;
  const slots = Math.max(n, window ?? 0);

  const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
  let max = Math.max(0, warnThreshold != null ? warnThreshold * 1.3 : 0);
  let lo = Infinity;
  for (const v of finite) {
    if (v > max) max = v;
    if (v < lo) lo = v;
  }
  max = max || 1;
  if (!warnThreshold && finite.length && lo > max * 0.9) max *= 1.6; // flat series sit mid-height, not pinned to the top

  const x = (i: number) => (slots < 2 ? w : ((i + slots - n) / (slots - 1)) * w);
  const y = (v: number) => h - 2 - clamp(v / max, 0, 1) * (h - 4);

  // Break the line into runs of consecutive finite samples, so a gap
  // (NaN/null/undefined) shows as a break rather than a false interpolation.
  const runs: Array<Array<{ i: number; v: number }>> = [];
  let current: Array<{ i: number; v: number }> = [];
  values.forEach((v, i) => {
    if (v != null && Number.isFinite(v)) {
      current.push({ i, v });
    } else if (current.length) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length) runs.push(current);

  const lastPoint = finite.length ? { i: values.findLastIndex((v) => v != null && Number.isFinite(v)), v: finite[finite.length - 1] } : null;
  const dotColor = SEVERITY_COLOR[severity];

  const svg = (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={title}
      style={{ width: '100%', height, overflow: 'visible', display: 'block' }}
    >
      <title>{title}</title>
      {runs.map((run, ri) => {
        const d = run.map((p, pi) => `${pi ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
        const areaD = run.length > 1 ? `${d}L${x(run[run.length - 1].i).toFixed(1)} ${h}L${x(run[0].i).toFixed(1)} ${h}Z` : '';
        return (
          <g key={ri}>
            {areaD && <path d={areaD} fill="var(--color-ink-primary)" fillOpacity={0.05} />}
            <path
              d={d}
              fill="none"
              stroke="var(--color-ink-muted)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      {warnThreshold != null && (
        <line
          x1={0}
          x2={w}
          y1={y(warnThreshold).toFixed(1)}
          y2={y(warnThreshold).toFixed(1)}
          stroke="var(--color-line-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {markIndex != null && (
        <line
          x1={x(markIndex).toFixed(1)}
          x2={x(markIndex).toFixed(1)}
          y1={0}
          y2={h}
          stroke="var(--color-ink-primary)"
          strokeWidth={1}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {lastPoint && (
        <circle cx={x(lastPoint.i).toFixed(1)} cy={y(lastPoint.v).toFixed(1)} r={2.5} fill={dotColor} />
      )}
    </svg>
  );

  if (!table) {
    return (
      <div className={className ? undefined : 'w-full'}>
        <Tooltip content={title}>
          <div>{svg}</div>
        </Tooltip>
      </div>
    );
  }

  const tableRows = values.map((v, i) => [
    timestamps?.[i] ?? String(i),
    v != null && Number.isFinite(v) ? formatValue(v) : '—',
  ]);

  return (
    <div className={className ? undefined : 'w-full'}>
      <Tooltip content={title}>
        <div>{svg}</div>
      </Tooltip>
      <TableView
        caption={title}
        columns={['t', unit ?? 'value']}
        rows={tableRows}
        buttonLabel="View as table"
      />
    </div>
  );
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
