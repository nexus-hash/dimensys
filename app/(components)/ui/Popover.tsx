'use client';

import * as React from 'react';
import { Popover as RadixPopover } from 'radix-ui';
import { cn } from './utils';
import { useAvoidOffset, type AvoidTarget } from './avoid';

export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  /** Element(s) or rect(s) this popover must never cover. */
  avoid?: AvoidTarget | AvoidTarget[];
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Popover. Radix's Popper keeps it inside the
 * viewport; the `avoid` prop additionally nudges it clear of a given element
 * or rect (e.g. the selected canvas node) if the viewport-safe placement
 * would still overlap it.
 */
export function Popover({
  trigger,
  children,
  avoid,
  side = 'bottom',
  align = 'center',
  open,
  onOpenChange,
  className,
}: PopoverProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const actuallyOpen = open ?? isOpen;
  const offset = useAvoidOffset(contentRef, avoid, actuallyOpen);

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setIsOpen(next);
        onOpenChange?.(next);
      }}
    >
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={contentRef}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className="z-chrome data-[state=open]:animate-[rise_var(--transition-duration-panel)_var(--ease-emphasized)] data-[state=closed]:animate-[riseOut_var(--transition-duration-micro)_var(--ease-exit)]"
          onOpenAutoFocus={(e) => {
            // Popovers that only display content (no focusable controls)
            // shouldn't steal focus from the trigger.
            if (!contentRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]')) {
              e.preventDefault();
            }
          }}
        >
          <div
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            className={cn(
              'min-w-48 rounded-card border border-line-hairline bg-surface-overlay p-3 shadow-elevation-2',
              className,
            )}
          >
            {children}
          </div>
          <RadixPopover.Arrow className="fill-surface-overlay" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export const PopoverClose = RadixPopover.Close;
