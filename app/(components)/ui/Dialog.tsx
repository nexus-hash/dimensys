'use client';

import * as React from 'react';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';
import { cn } from './utils';
import { IconButton } from './Button';
import { CloseIcon } from './icons';

export interface DialogProps {
  trigger?: React.ReactElement;
  title: React.ReactNode;
  /** Required for a11y; visually hidden if `hideDescription` is set. */
  description?: React.ReactNode;
  hideDescription?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Dialog / Modal (prototype `.modal` / `.modal-card`). Radix Dialog supplies
 * the focus trap (focus enters on open, is contained, and returns to the
 * trigger on close) and closes on Escape and scrim click.
 */
export function Dialog({
  trigger,
  title,
  description,
  hideDescription = false,
  children,
  footer,
  open,
  onOpenChange,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-dialog bg-[color-mix(in_srgb,var(--ink-primary)_32%,transparent)]',
            'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
            'data-[state=closed]:animate-[fadeout_var(--transition-duration-micro)_var(--ease-exit)]',
          )}
        />
        <RadixDialog.Content
          className={cn(
            'fixed inset-0 z-dialog grid place-items-center p-4',
            'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
          )}
        >
          <div
            className={cn(
              'w-full max-w-[720px] max-h-[calc(100dvh-32px)] overflow-auto rounded-card border border-line-strong bg-surface-overlay shadow-elevation-2',
              'data-[state=open]:animate-[rise_var(--transition-duration-panel)_var(--ease-emphasized)]',
              className,
            )}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line-hairline px-4.5 py-4">
              <RadixDialog.Title className="text-title-3 text-ink-primary">{title}</RadixDialog.Title>
              <RadixDialog.Close asChild>
                <IconButton aria-label="Close dialog" size="sm">
                  <CloseIcon />
                </IconButton>
              </RadixDialog.Close>
            </div>
            {hideDescription ? (
              <VisuallyHidden.Root asChild>
                <RadixDialog.Description>{description}</RadixDialog.Description>
              </VisuallyHidden.Root>
            ) : description ? (
              <RadixDialog.Description className="px-4.5 pt-3 text-body text-ink-secondary">
                {description}
              </RadixDialog.Description>
            ) : (
              <VisuallyHidden.Root asChild>
                <RadixDialog.Description>{typeof title === 'string' ? title : 'Dialog'}</RadixDialog.Description>
              </VisuallyHidden.Root>
            )}
            <div className="p-4.5">{children}</div>
            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-line-hairline px-4.5 py-3.5">
                {footer}
              </div>
            ) : null}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

