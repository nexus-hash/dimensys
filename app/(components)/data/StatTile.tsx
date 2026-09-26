import { Tooltip } from '@/app/(components)/ui';
import { HealthGlyph } from '@/app/(components)/canvas';
import { Sparkline } from './Sparkline';
import type { Severity } from './format';

export interface StatTileDelta {
  /** `1` = worse than baseline, `-1` = better, `0` = ≈ baseline. */
  direction: 1 | -1 | 0;
  /** Rendered delta text, e.g. "1.8×", "2.4 pts", "≈ baseline". */
  text: string;
  /** Colors the arrow when the delta itself reads as bad; `undefined` keeps it muted. */
  bad?: 'critical' | 'warn';
}

export interface StatTileProps {
  label: string;
  /** Already-formatted value, e.g. via `formatMetricValue` — kept as a string so callers control precision. */
  value: string;
  unit?: string;
  delta?: StatTileDelta;
  /** Drives the inset ring + glyph. */
  severity?: Severity;
  sparkline?: {
    values: Array<number | null | undefined>;
    window?: number;
    warnThreshold?: number;
    unit?: string;
    timestamps?: string[];
    formatValue?: (v: number) => string;
  };
  tooltip?: string;
  className?: string;
}

const SEVERITY_LABEL: Record<2 | 1, string> = { 2: 'critical', 1: 'warning' };
const SEVERITY_RING: Record<2 | 1, string> = {
  2: 'shadow-[inset_0_0_0_2px_var(--color-signal-critical),0_0_16px_rgba(225,29,72,0.15)]',
  1: 'shadow-[inset_0_0_0_1.5px_var(--color-signal-warn)]',
};

/**
 * StatTile: the form for a single live value — value + delta +
 * optional sparkline. Matches the approved prototype's HUD tile exactly: a
 * 2×2 grid (label + severity glyph top-left, delta top-right, the big mono
 * value bottom-left, the sparkline bottom-right), so it drops straight into
 * the HUD strip at native size. A live-updating value is `tabular-nums`
 * so digits don't jitter as it ticks.
 */
export function StatTile({ label, value, unit, delta, severity = 0, sparkline, tooltip, className }: StatTileProps) {
  const ring = severity ? SEVERITY_RING[severity as 1 | 2] : '';

  const body = (
    <div
      className={`grid grid-cols-[auto_minmax(56px,1fr)] grid-rows-2 items-center gap-x-2.5 gap-y-px rounded-[10px] border border-line-hairline bg-surface-raised px-2.5 py-1.5 ${ring} ${className ?? ''}`.trim()}
    >
      <div className="col-start-1 row-start-1 flex items-center justify-start gap-1.5">
        {severity > 0 && (
          <HealthGlyph
            state={severity === 2 ? 'critical' : 'warn'}
            size={14}
            ariaLabel={SEVERITY_LABEL[severity as 1 | 2]}
          />
        )}
        <span className="whitespace-nowrap text-caption text-ink-secondary">{label}</span>
      </div>

      {delta && (
        <div className="col-start-2 row-start-1 overflow-hidden text-right font-mono text-[11px] font-medium text-ellipsis whitespace-nowrap text-ink-muted">
          <span
            className="font-bold"
            style={{
              color:
                delta.bad === 'critical'
                  ? 'var(--color-signal-critical)'
                  : delta.bad === 'warn'
                    ? 'var(--color-signal-warn)'
                    : undefined,
            }}
          >
            {delta.direction === 1 ? '↑' : delta.direction === -1 ? '↓' : ''}
          </span>{' '}
          {delta.text}
        </div>
      )}

      <div className="col-start-1 row-start-2 flex items-baseline gap-1 whitespace-nowrap">
        <span className="font-mono text-[16px] leading-[1.2] tabular-nums text-ink-primary" style={{ letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {unit && <small className="font-mono text-[11px] text-ink-muted">{unit}</small>}
      </div>

      {sparkline && (
        <div className="col-start-2 row-start-2 min-w-0">
          <Sparkline
            values={sparkline.values}
            window={sparkline.window}
            height={20}
            warnThreshold={sparkline.warnThreshold}
            severity={severity}
            title={`${label}, last ${sparkline.window ?? sparkline.values.length} samples, now ${value}${unit ? ` ${unit}` : ''}`}
            unit={sparkline.unit ?? unit}
            timestamps={sparkline.timestamps}
            formatValue={sparkline.formatValue}
          />
        </div>
      )}
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{body}</Tooltip> : body;
}
