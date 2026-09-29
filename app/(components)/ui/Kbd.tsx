import type { ReactNode } from 'react';
import { cn } from './utils';

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** A single keyboard hint chip, mono, 12px minimum caption size. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 h-5 items-center justify-center rounded-[5px] px-[5px]',
        'border border-line-strong border-b-2 bg-surface-raised text-ink-secondary',
        'font-mono text-[12px] font-medium leading-none',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
