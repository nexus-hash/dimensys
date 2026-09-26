'use client';

import * as React from 'react';
import { Select as RadixSelect } from 'radix-ui';
import { cn } from './utils';
import { CheckIcon, ChevronDownIcon } from './icons';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/** Select: Radix Select for native-equivalent keyboard/typeahead behavior. */
export function Select({ options, value, onValueChange, placeholder, disabled, className, ...aria }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger
        aria-label={aria['aria-label']}
        className={cn(
          'inline-flex h-9 items-center justify-between gap-2 rounded-control border border-line-hairline bg-surface-raised px-3',
          'text-sm text-ink-primary outline-none data-[placeholder]:text-ink-muted',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
          'disabled:opacity-45 disabled:pointer-events-none',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDownIcon className="h-4 w-4 text-ink-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-chrome overflow-hidden rounded-card border border-line-hairline bg-surface-overlay shadow-elevation-2 data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]"
          position="popper"
          sideOffset={6}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={cn(
                  'relative flex h-8 cursor-pointer select-none items-center rounded-md pl-7 pr-3 text-sm text-ink-primary outline-none',
                  'data-[highlighted]:bg-surface-glass data-[disabled]:opacity-45 data-[disabled]:pointer-events-none',
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex">
                  <CheckIcon className="h-3.5 w-3.5 text-brand" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
