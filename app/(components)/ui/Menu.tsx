'use client';

import * as React from 'react';
import { DropdownMenu as RxDropdown, ContextMenu as RxContext } from 'radix-ui';
import { cn } from './utils';
import { CheckIcon } from './icons';

export interface MenuItem {
  type?: 'item';
  value: string;
  label: React.ReactNode;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}
export interface MenuSeparator {
  type: 'separator';
}
export type MenuEntry = MenuItem | MenuSeparator;

const CONTENT_CLASSES = cn(
  'z-chrome min-w-[200px] overflow-hidden rounded-card border border-line-hairline bg-surface-overlay p-1 shadow-elevation-2',
  'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
);

function itemClasses(danger?: boolean) {
  return cn(
    'flex h-8 cursor-pointer select-none items-center justify-between gap-4 rounded-md px-2.5 text-[13px] outline-none',
    danger ? 'text-signal-critical' : 'text-ink-primary',
    'data-[highlighted]:bg-surface-glass data-[disabled]:opacity-45 data-[disabled]:pointer-events-none',
  );
}

export interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: MenuEntry[];
  onSelect: (value: string) => void;
  align?: 'start' | 'center' | 'end';
}

/** DropdownMenu (§12): a triggered command menu, opened by click or Enter/Space. */
export function DropdownMenu({ trigger, items, onSelect, align = 'start' }: DropdownMenuProps) {
  return (
    <RxDropdown.Root>
      <RxDropdown.Trigger asChild>{trigger}</RxDropdown.Trigger>
      <RxDropdown.Portal>
        <RxDropdown.Content className={CONTENT_CLASSES} align={align} sideOffset={6}>
          {items.map((entry, i) =>
            entry.type === 'separator' ? (
              <RxDropdown.Separator key={i} className="my-1 h-px bg-line-hairline" />
            ) : (
              <RxDropdown.Item
                key={entry.value}
                disabled={entry.disabled}
                className={itemClasses(entry.danger)}
                onSelect={() => onSelect(entry.value)}
              >
                {entry.label}
                {entry.shortcut ? <span className="text-ink-muted font-mono text-[12px]">{entry.shortcut}</span> : null}
              </RxDropdown.Item>
            ),
          )}
        </RxDropdown.Content>
      </RxDropdown.Portal>
    </RxDropdown.Root>
  );
}

export interface ContextMenuProps {
  children: React.ReactElement;
  items: MenuEntry[];
  onSelect: (value: string) => void;
}

/** ContextMenu (§12): right-click (or long-press) menu. */
export function ContextMenu({ children, items, onSelect }: ContextMenuProps) {
  return (
    <RxContext.Root>
      <RxContext.Trigger asChild>{children}</RxContext.Trigger>
      <RxContext.Portal>
        <RxContext.Content className={CONTENT_CLASSES}>
          {items.map((entry, i) =>
            entry.type === 'separator' ? (
              <RxContext.Separator key={i} className="my-1 h-px bg-line-hairline" />
            ) : (
              <RxContext.Item
                key={entry.value}
                disabled={entry.disabled}
                className={itemClasses(entry.danger)}
                onSelect={() => onSelect(entry.value)}
              >
                {entry.label}
                {entry.shortcut ? <span className="text-ink-muted font-mono text-[12px]">{entry.shortcut}</span> : null}
              </RxContext.Item>
            ),
          )}
        </RxContext.Content>
      </RxContext.Portal>
    </RxContext.Root>
  );
}

export { CheckIcon as MenuCheckIcon };
