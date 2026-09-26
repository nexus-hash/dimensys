import { Tooltip } from '@/app/(components)/ui';
import { TableView } from './TableView';

export interface DumbbellRow {
  label: string;
  /** The "from" value, e.g. without a fix. Rendered as the hollow dot. */
  before: number;
  /** The "to" value, e.g. with a fix applied. Rendered as the filled dot. */
  after: number;
}

export interface DumbbellBarsProps {
  rows: DumbbellRow[];
  /** Scale the track covers; both values are clamped into it. */
  min?: number;
  max?: number;
  beforeLabel: string;
  afterLabel: string;
  /** Formats a raw value for the tooltip/table; defaults to `String`. */
  formatValue?: (v: number) => string;
  /** Small caption under the legend, e.g. "0–10 · higher is better". */
  caption?: string;
  className?: string;
}

/**
 * DumbbellBars (§8): comparisons across a few axes — e.g. a fix applied vs
 * not. Two dots on a shared track connected by a segment; a legend spells
 * out which dot is which (never color-only: the dots differ in fill, not
 * just hue), and a table view lists the same rows as numbers.
 */
export function DumbbellBars({
  rows,
  min = 0,
  max = 10,
  beforeLabel,
  afterLabel,
  formatValue = (v) => String(v),
  caption,
  className,
}: DumbbellBarsProps) {
  return (
    <div className={className}>
      <div className="grid gap-2.5">
        {rows.map((row) => {
          const aPct = clamp(((row.before - min) / (max - min)) * 100, 0, 100);
          const bPct = clamp(((row.after - min) / (max - min)) * 100, 0, 100);
          const left = Math.min(aPct, bPct);
          const width = Math.abs(aPct - bPct);
          const title = `${row.label}: ${beforeLabel} ${formatValue(row.before)} · ${afterLabel} ${formatValue(row.after)}`;
          return (
            <div key={row.label} className="grid grid-cols-[92px_1fr] items-center gap-2.5 text-caption text-ink-secondary">
              <span className="truncate">{row.label}</span>
              <Tooltip content={title}>
                <div className="relative h-[18px]" role="img" aria-label={title}>
                  <div className="absolute inset-x-0 top-[8px] h-0.5 rounded-full bg-line-hairline" />
                  <span
                    className="absolute top-[8px] h-0.5 rounded-full bg-line-strong transition-[left,width] duration-[var(--transition-duration-panel)] ease-[var(--ease-standard)]"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                  <span
                    className="absolute top-[3px] h-3 w-3 -ml-1.5 rounded-full border-2 border-ink-primary bg-surface-page transition-[left] duration-[var(--transition-duration-panel)] ease-[var(--ease-standard)]"
                    style={{ left: `${aPct}%` }}
                  />
                  <span
                    className="absolute top-[3px] h-3 w-3 -ml-1.5 rounded-full bg-ink-primary transition-[left] duration-[var(--transition-duration-panel)] ease-[var(--ease-standard)]"
                    style={{ left: `${bPct}%` }}
                  />
                </div>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 font-mono text-[12px] font-medium text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-ink-primary" />
          {afterLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink-primary bg-surface-page" />
          {beforeLabel}
        </span>
        {caption && <span>{caption}</span>}
      </div>
      <TableView
        caption={`${beforeLabel} vs ${afterLabel}`}
        columns={['', beforeLabel, afterLabel]}
        rows={rows.map((r) => [r.label, formatValue(r.before), formatValue(r.after)])}
      />
    </div>
  );
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
