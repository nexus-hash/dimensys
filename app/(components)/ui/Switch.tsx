'use client';

import * as React from 'react';
import { Switch as RadixSwitch } from 'radix-ui';
import { cn } from './utils';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/** Switch (prototype `.switch`): brand-filled track, spring-ish thumb. */
export function Switch({ className, ...props }: SwitchProps & { className?: string }) {
  return (
    <RadixSwitch.Root
      className={cn(
        'relative h-5 w-[34px] flex-none rounded-pill bg-line-strong transition-colors duration-micro',
        'data-[state=checked]:bg-brand',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
        'disabled:opacity-45 disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block h-4 w-4 translate-x-0.5 rounded-full bg-surface-overlay shadow-elevation-1',
          'transition-transform duration-[220ms] ease-[cubic-bezier(.3,1.25,.4,1)]',
          'data-[state=checked]:translate-x-[18px]',
        )}
      />
    </RadixSwitch.Root>
  );
}
