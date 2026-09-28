'use client';

import * as React from 'react';
import { RadioGroup } from 'radix-ui';
import { cn } from './utils';
import { useReducedMotion } from './useReducedMotion';

interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  /** Optional trailing `Kbd`-style hint (e.g. a mode number). */
  hint?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * SegmentedControl (prototype `.seg`): a sliding-indicator radiogroup.
 * Built on Radix `RadioGroup` for the WAI-ARIA radiogroup keyboard pattern
 * (arrow keys move the selection, Home/End jump to the ends) for free.
 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
  size = 'md',
  ...aria
}: SegmentedControlProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = React.useState<{ x: number; width: number } | null>(null);
  const reducedMotion = useReducedMotion();

  const measure = React.useCallback(() => {
    const root = rootRef.current;
    const el = itemRefs.current.get(value);
    if (!root || !el) return;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({ x: elRect.left - rootRect.left, width: elRect.width });
  }, [value]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Re-measure whenever the root or an item changes size (window resize, and
  // the web font swapping in after a refresh, which changes label widths).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    itemRefs.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure, options]);

  return (
    <RadioGroup.Root
      ref={rootRef}
      value={value}
      onValueChange={onValueChange}
      aria-label={aria['aria-label']}
      className={cn(
        'relative inline-flex gap-0.5 rounded-lg border border-line-hairline bg-surface-sunken p-0.75',
        className,
      )}
    >
      {indicator ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-0.75 bottom-0.75 left-0 rounded-md border border-brand bg-brand-subtle shadow-elevation-1',
            reducedMotion ? '' : 'transition-[transform,width] duration-260 ease-standard',
          )}
          style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
        />
      ) : null}
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          ref={(el) => {
            if (el) itemRefs.current.set(opt.value, el);
            else itemRefs.current.delete(opt.value);
          }}
          value={opt.value}
          disabled={opt.disabled}
          // Radix RadioGroup's roving-tabindex only *moves focus* on arrow
          // keys (a standalone radio group commits with Space); a segmented
          // control is expected to switch immediately, like Tabs' automatic
          // activation mode. `onFocus` covers both the keyboard-arrow path
          // and the mouse-click path (Radix focuses the item on click too).
          onFocus={() => !opt.disabled && onValueChange(opt.value)}
          className={cn(
            'relative z-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium text-ink-secondary',
            'transition-colors duration-micro hover:text-brand-ink data-[state=checked]:text-brand-ink',
            'disabled:pointer-events-none disabled:opacity-45',
            'hover:[&_kbd]:border-brand hover:[&_kbd]:text-brand-ink data-[state=checked]:[&_kbd]:border-brand data-[state=checked]:[&_kbd]:text-brand-ink',
            'focus-visible:outline-2 focus-visible:outline-brand focus:text-brand-ink focus-visible:outline-offset-2',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]',
          )}
        >
          {opt.label}
          {opt.hint}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
