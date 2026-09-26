'use client';

import * as React from 'react';
import { Tooltip as RadixTooltip } from 'radix-ui';
import { cn } from './utils';
import { useAvoidOffset, type AvoidTarget } from './avoid';

export const TooltipProvider = RadixTooltip.Provider;

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  /** Element(s) or rect(s) the tooltip must never cover (§15.6). */
  avoid?: AvoidTarget | AvoidTarget[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Tooltip (prototype `.tip`): collision-aware, and keeps clear of `avoid`. */
export function Tooltip({
  content,
  children,
  avoid,
  side = 'top',
  delayDuration = 250,
  open,
  onOpenChange,
}: TooltipProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const actuallyOpen = open ?? isOpen;
  const offset = useAvoidOffset(contentRef, avoid, actuallyOpen);

  return (
    <RadixTooltip.Root
      delayDuration={delayDuration}
      open={open}
      onOpenChange={(next) => {
        setIsOpen(next);
        onOpenChange?.(next);
      }}
    >
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          ref={contentRef}
          side={side}
          sideOffset={8}
          collisionPadding={8}
          className="z-toast data-[state=delayed-open]:animate-[fadein_var(--transition-duration-small)_ease-out] data-[state=instant-open]:animate-[fadein_var(--transition-duration-small)_ease-out]"
        >
          {/* Radix positions this Content node itself (via an internal inline
              `transform`); the avoid-offset nudge is applied on this inner
              wrapper instead, so the two transforms never collide. */}
          <div
            className={cn(
              'rounded-md border border-line-hairline bg-surface-glass px-2.5 py-1.5 backdrop-blur-md',
              'font-mono text-[12px] text-ink-primary shadow-elevation-1',
            )}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          >
            {content}
          </div>
          <RadixTooltip.Arrow className="fill-surface-overlay" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
