import { Tooltip } from '@/app/(components)/ui';
import { HealthGlyph } from '@/app/(components)/canvas';
import { TableView } from './TableView';
import { severityFromThresholds, type Severity } from './format';

export interface MeterProps {
  /** e.g. "core-db util", "Budget". */
  label: string;
  /** 0–1 fill ratio. */
  value: number;
  /** Always-visible mono text for the current value, e.g. "82%", "$2,161 / $3,000". */
  valueLabel: string;
  /** Ratio at which the fill turns warn. */
  warnAt?: number;
  /** Ratio at which the fill turns critical. */
  criticalAt?: number;
  /** Explicit severity override, if the caller already computed it (e.g. from a non-ratio metric). */
  severity?: Severity;
  tooltip?: string;
  /** Table-view rows underneath, e.g. history samples: `[["t=0:00", "62%"], ...]`. */
  tableRows?: Array<Array<string | number>>;
  tableColumns?: [string, string];
  className?: string;
}

const SEVERITY_LABEL: Record<Severity, string> = { 0: 'ok', 1: 'warning', 2: 'critical' };

/**
 * Meter: a hairline track with an ink fill; above threshold the fill
 * takes the signal color, but severity is never color-only — a health glyph
 * appears next to the always-present numeric label.
 */
export function Meter({
  label,
  value,
  valueLabel,
  warnAt,
  criticalAt,
  severity,
  tooltip,
  tableRows,
  tableColumns = ['t', 'value'],
  className,
}: MeterProps) {
  const sev = severity ?? severityFromThresholds(value, warnAt, criticalAt);
  const fillColor =
    sev === 2 ? 'var(--color-signal-critical)' : sev === 1 ? 'var(--color-signal-warn)' : 'var(--color-ink-secondary)';
  const pct = `${clamp(value, 0, 1) * 100}%`;

  const body = (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-ink-secondary">{label}</span>
        <span className="flex items-center gap-1.5 font-mono text-[12px] font-medium tabular-nums text-ink-primary">
          {sev > 0 && <HealthGlyph state={sev === 2 ? 'critical' : 'warn'} size={13} ariaLabel={SEVERITY_LABEL[sev]} />}
          {valueLabel}
        </span>
      </div>
      <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-line-hairline">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-[var(--transition-duration-panel)] ease-[var(--ease-standard)]"
          style={{ width: pct, background: fillColor }}
        />
      </div>
      {tableRows && <TableView caption={`${label} history`} columns={tableColumns} rows={tableRows} />}
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{body}</Tooltip> : body;
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
