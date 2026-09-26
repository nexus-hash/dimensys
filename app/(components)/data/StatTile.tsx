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
  /** Drives the inset ring + glyph (§5.3/§3.4: severity is never color-only). */
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
 * StatTile (§8): the form for a single live value — value + delta +
 * optional sparkline. A live-updating value is `tabular-nums` (§3.2) so
 * digits don't jitter as it ticks.
 */
export function StatTile({ label, value, unit, delta, severity = 0, sparkline, tooltip, className }: StatTileProps) {
  const ring = severity ? SEVERITY_RING[severity as 1 | 2] : '';

  const body = (
    <div
      className={`rounded-[10px] border border-line-hairline bg-surface-raised p-3 ${ring} ${className ?? ''}`.trim()}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-caption text-ink-secondary">{label}</span>
        {severity > 0 && (
          <HealthGlyph
            state={severity === 2 ? 'critical' : 'warn'}
            size={14}
            ariaLabel={SEVERITY_LABEL[severity as 1 | 2]}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-mono-metric tabular-nums text-ink-primary" style={{ letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {unit && <small className="font-mono text-mono-sm text-ink-muted">{unit}</small>}
      </div>
      {delta && (
        <div className="mt-0.5 font-mono text-[12px] font-medium whitespace-nowrap text-ink-muted">
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
      {sparkline && (
        <div className="mt-1">
          <Sparkline
            values={sparkline.values}
            window={sparkline.window}
            height={24}
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
