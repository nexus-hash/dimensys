import { HealthGlyph } from '@/app/(components)/canvas';

export type RequirementStatus = 'pass' | 'fail' | 'pending' | 'not-simulated';

export interface RequirementBadgeProps {
  /** The requirement text, e.g. "p99 < 50 ms". */
  text: string;
  status: RequirementStatus;
  /** The observed value line, e.g. "p99 42 ms". Required unless `not-simulated`. */
  observed?: string;
  className?: string;
}

/** A neutral dot for `pending` (prototype `GLYPH.none`) — no verdict yet, not a failure. */
function PendingGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable={false}>
      <circle cx={8} cy={8} r={2.5} style={{ fill: 'var(--color-ink-muted)' }} />
    </svg>
  );
}

/**
 * RequirementBadge: a requirement's pass/fail state plus the observed
 * value that decided it, e.g. "p99 < 50 ms" / "p99 42 ms". Reuses the canvas
 * health glyph for pass/fail so the same ✓/✕ shapes read consistently
 * everywhere; `pending` (debounced, not yet settled) and `not-simulated`
 * (functional requirement with no live metric) get their own neutral marks.
 */
export function RequirementBadge({ text, status, observed, className }: RequirementBadgeProps) {
  const glyph =
    status === 'pass' ? (
      <HealthGlyph state="ok" size={16} ariaLabel="passing" />
    ) : status === 'fail' ? (
      <HealthGlyph state="critical" size={16} ariaLabel="failing" />
    ) : (
      <PendingGlyph size={16} />
    );

  return (
    <div className={`grid grid-cols-[16px_1fr] items-start gap-2 text-body ${className ?? ''}`.trim()}>
      <span className="mt-px">{glyph}</span>
      <div>
        <span className="text-ink-secondary">{text}</span>
        <span className="mt-0.5 block font-mono text-mono-sm tabular-nums text-ink-muted">
          {status === 'not-simulated' ? 'functional · not simulated' : (observed ?? '—')}
        </span>
      </div>
    </div>
  );
}
