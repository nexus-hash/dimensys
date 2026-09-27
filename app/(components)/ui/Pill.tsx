import type { ReactNode } from 'react';
import { cn } from './utils';

type PillVariant = 'neutral' | 'brand' | 'ok' | 'warn' | 'critical';

export interface PillProps {
  children: ReactNode;
  variant?: PillVariant;
  icon?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<PillVariant, string> = {
  neutral: 'text-ink-secondary border-line-hairline',
  brand: 'text-brand-ink border-brand/35 bg-brand-subtle',
  ok: 'text-ink-primary border-signal-ok/45 bg-signal-ok/10',
  warn: 'text-ink-primary border-signal-warn/50 bg-signal-warn/15',
  critical: 'text-ink-primary border-signal-critical/50 bg-signal-critical/10',
};

/** Pill/Badge (prototype `.pill`): mono 12px, full radius, hairline border. */
export function Pill({ children, variant = 'neutral', icon, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-pill border px-2',
        'font-mono text-[12px] font-medium leading-none whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon ? <span className="[&>svg]:h-3 [&>svg]:w-3 flex-none">{icon}</span> : null}
      {children}
    </span>
  );
}
