import { HealthGlyph, type HealthState } from '@/app/(components)/canvas';

export interface HealthBadgeProps {
  state: HealthState;
  /** e.g. "critical", "Redis Cache: critical". */
  label: string;
  /** Extra mono detail, e.g. "err 38%", "p99 640 ms". */
  detail?: string;
  size?: number;
  className?: string;
}

const STATE_TEXT_CLASS: Record<HealthState, string> = {
  ok: 'text-ink-secondary',
  warn: 'text-ink-primary',
  critical: 'text-ink-primary',
  down: 'text-ink-muted',
  recovering: 'text-ink-primary',
};

/**
 * HealthBadge (§8/§5.3): glyph + label, sharing `HealthGlyph` with the
 * canvas (DS5) so the HUD and the diagram agree on what each state looks
 * like. Never color-only — the glyph shape and the text label both carry
 * the state, independent of the ring/hue.
 */
export function HealthBadge({ state, label, detail, size = 16, className }: HealthBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`.trim()}>
      <HealthGlyph state={state} size={size} ariaLabel={state} />
      <span className={`text-body font-medium ${STATE_TEXT_CLASS[state]}`}>{label}</span>
      {detail && <span className="font-mono text-mono-sm tabular-nums text-ink-muted">{detail}</span>}
    </span>
  );
}
