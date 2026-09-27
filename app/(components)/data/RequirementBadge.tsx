import { HealthGlyph } from '@/app/(components)/canvas';

type RequirementStatus = 'pass' | 'fail' | 'pending' | 'not-simulated';

interface RequirementBadgeProps {
  /** The requirement text, e.g. "p99 < 50 ms". */
  text: string;
  status: RequirementStatus;
  /** The observed value line, e.g. "p99 42 ms". Omitted → no second line at all (never a placeholder dash). */
  observed?: string;
  className?: string;
}

/** A neutral dot for `pending` — no verdict yet, not a failure. */
function PendingGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable={false}>
      <circle cx={8} cy={8} r={2.5} style={{ fill: 'var(--color-ink-muted)' }} />
    </svg>
  );
}

/**
 * Keeps a threshold phrase on one line: "≥ 38 rps" or "< 50 ms" never
 * breaks between the comparator, the number and its unit, so a wrap moves
 * the whole phrase down instead of orphaning "rps" on a line of its own.
 */
function keepThresholdTogether(text: string): string {
  return text
    .replace(/([≥≤<>=≠]) (?=[\d$.])/g, '$1\u00a0')
    .replace(/(\d[\d.,]*[kKmM]?) (?=[a-zA-Z%/][\w%/]*)/g, '$1\u00a0');
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

  const second = status === 'not-simulated' ? 'functional · not simulated' : observed?.trim() || undefined;

  return (
    // Glyph column + text column: a wrapped line hangs under the text, never under the glyph.
    <div className={`grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2 text-[13px] leading-[1.4] ${className ?? ''}`.trim()}>
      <span className="mt-px flex h-4 w-4">{glyph}</span>
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <span className="text-ink-secondary">{keepThresholdTogether(text)}</span>
        {second ? (
          <span className="mt-0.5 block font-mono text-mono-sm tabular-nums text-ink-muted">{second}</span>
        ) : null}
      </div>
    </div>
  );
}
