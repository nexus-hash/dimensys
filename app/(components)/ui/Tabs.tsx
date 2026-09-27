'use client';

import * as React from 'react';
import { Tabs as RadixTabs } from 'radix-ui';
import { cn } from './utils';
import { useReducedMotion } from './useReducedMotion';

interface TabItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

/**
 * Tabs (prototype `.tabs` / `.tab-ind`): a bottom sliding indicator over a
 * hairline-bordered tab strip. Built on Radix Tabs, which handles the
 * arrow-key / Home / End tablist keyboard pattern.
 */
export function Tabs({ items, value, onValueChange, children, className, ...aria }: TabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const triggerRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = React.useState<{ x: number; width: number } | null>(null);
  const reducedMotion = useReducedMotion();

  const measure = React.useCallback(() => {
    const list = listRef.current;
    const el = triggerRefs.current.get(value);
    if (!list || !el) return;
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({ x: elRect.left - listRect.left + list.scrollLeft, width: elRect.width });
  }, [value]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List
        ref={listRef}
        aria-label={aria['aria-label']}
        className="relative flex gap-0.5 overflow-x-auto border-b border-line-hairline px-3 [scrollbar-width:none]"
      >
        {indicator ? (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute bottom-[-1px] h-0.5 rounded-full bg-brand',
              reducedMotion ? '' : 'transition-[transform,width] duration-[260ms] ease-standard',
            )}
            style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
          />
        ) : null}
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            ref={(el) => {
              if (el) triggerRefs.current.set(item.value, el);
              else triggerRefs.current.delete(item.value);
            }}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'h-10 whitespace-nowrap px-2 text-[13px] font-medium text-ink-muted transition-colors duration-micro',
              'hover:text-ink-secondary data-[state=active]:text-ink-primary',
              'disabled:pointer-events-none disabled:opacity-45',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabsContent = RadixTabs.Content;
