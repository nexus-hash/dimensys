import { Tooltip } from '@/app/(components)/ui';
import { HealthGlyph } from '@/app/(components)/canvas';
import { NumberRoll } from '@/app/(components)/motion';
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

interface StatTileProps {
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
    /** Accessible name/tooltip for the chart; defaults to "<label>, last <n> samples, now <value>". */
    title?: string;
  };
  tooltip?: string;
  className?: string;
  /**
   * Optional: renders the value as a rolling number instead of static text.
   * `value` still controls what's shown at rest/on first paint (and SSR);
   * this only wires up the animated ticks on later updates. Formatting stays
   * the caller's job, same as `value`.
   */
  numberRoll?: { value: number; format: (v: number) => string };
  /**
   * `default`: the gallery/detail tile — a sparkline that carries its own
   * "view as table" disclosure.
   * `compact`: the player's HUD strip tile — one tight 2×2 row (label over
   * value on the left, delta over a 20px sparkline on the right), capped at
   * 230px wide and 48px tall, no per-tile table (the strip offers one table
   * for all of its tiles instead).
   */
  variant?: 'default' | 'compact';
}

const SEVERITY_LABEL: Record<2 | 1, string> = { 2: 'critical', 1: 'warning' };
const SEVERITY_RING: Record<2 | 1, string> = {
  2: 'shadow-[inset_0_0_0_2px_var(--color-signal-critical),0_0_16px_rgba(225,29,72,0.15)]',
  1: 'shadow-[inset_0_0_0_1.5px_var(--color-signal-warn)]',
};

const LAYOUT = {
  default: {
    grid: 'grid-cols-[auto_minmax(56px,1fr)] grid-rows-2 py-1.5',
    label: 'text-caption',
    topRow: '',
    valueRow: '',
  },
  compact: {
    // Row 1 is pinned to a 14px line box (the glyph's own size), so the
    // tile is 2 + 10 + 14 + 1 + 20 = 47px tall whatever the inherited
    // line-height is.
    grid: 'max-w-[230px] min-w-0 grid-cols-[auto_minmax(36px,1fr)] grid-rows-[auto_auto] py-[5px] overflow-hidden',
    label: 'truncate text-[11px] font-medium leading-[14px]',
    topRow: 'h-[14px] leading-[14px]',
    valueRow: 'leading-none',
  },
} as const;

/**
 * StatTile: the form for a single live value — value + delta +
 * optional sparkline, laid out as a 2×2 grid (label + severity glyph
 * top-left, delta top-right, the mono value bottom-left, the sparkline
 * bottom-right). A live-updating value is `tabular-nums` so digits don't
 * jitter as it ticks. See `variant` for the two sizes.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  severity = 0,
  sparkline,
  tooltip,
  className,
  numberRoll,
  variant = 'default',
}: StatTileProps) {
  const ring = severity ? SEVERITY_RING[severity as 1 | 2] : '';
  const layout = LAYOUT[variant];
  const compact = variant === 'compact';

  const body = (
    <div
      data-variant={variant}
      className={`grid ${layout.grid} items-center gap-x-2.5 gap-y-px rounded-[10px] border border-line-hairline bg-surface-raised px-2.5 ${ring} ${className ?? ''}`.trim()}
    >
      <div className={`col-start-1 row-start-1 flex min-w-0 items-center justify-start gap-1.5 ${layout.topRow}`.trim()}>
        {severity > 0 && (
          <HealthGlyph
            state={severity === 2 ? 'critical' : 'warn'}
            size={14}
            ariaLabel={SEVERITY_LABEL[severity as 1 | 2]}
          />
        )}
        <span className={`whitespace-nowrap text-ink-secondary ${layout.label}`}>{label}</span>
      </div>

      {delta && (
        <div
          className={`col-start-2 row-start-1 min-w-0 overflow-hidden text-right font-mono text-[11px] font-medium text-ellipsis whitespace-nowrap text-ink-muted ${layout.topRow}`.trim()}
        >
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

      <div className={`col-start-1 row-start-2 flex items-baseline gap-1 whitespace-nowrap ${layout.valueRow}`.trim()}>
        {numberRoll ? (
          <NumberRoll
            value={numberRoll.value}
            format={numberRoll.format}
            className="font-mono text-[16px] leading-[1.2] text-ink-primary"
            style={{ letterSpacing: '-0.01em' }}
          />
        ) : (
          <span className="font-mono text-[16px] leading-[1.2] tabular-nums text-ink-primary" style={{ letterSpacing: '-0.01em' }}>
            {value}
          </span>
        )}
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
            title={sparkline.title ?? `${label}, last ${sparkline.window ?? sparkline.values.length} samples, now ${value}${unit ? ` ${unit}` : ''}`}
            unit={sparkline.unit ?? unit}
            timestamps={sparkline.timestamps}
            formatValue={sparkline.formatValue}
            table={!compact}
          />
        </div>
      )}
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{body}</Tooltip> : body;
}
