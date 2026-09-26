'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-on-brand font-semibold bg-[image:var(--brand-gradient)] hover:shadow-brand-glow',
  glass: 'bg-surface-glass border-line-strong backdrop-blur-md hover:border-ink-muted',
  ghost: 'text-ink-secondary hover:text-ink-primary hover:bg-surface-glass',
  danger:
    'text-ink-primary bg-signal-critical/10 border-signal-critical/45 hover:border-signal-critical',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-[30px] px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

const ICON_ONLY_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'w-[30px] px-0',
  md: 'w-9 px-0',
  lg: 'w-11 px-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as an icon-only square button (requires `aria-label`). */
  iconOnly?: boolean;
  /** Merge props onto the single child element instead of rendering a `<button>`. */
  asChild?: boolean;
}

/**
 * Button.
 * `primary` uses `--brand-gradient` (chrome only, never the canvas per the design spec).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconOnly = false, asChild = false, className, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref as never}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-control border border-transparent',
        'font-medium transition-[transform,background,box-shadow,border-color] duration-micro ease-standard',
        'active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
        VARIANT_CLASSES[variant],
        iconOnly ? ICON_ONLY_SIZE_CLASSES[size] : SIZE_CLASSES[size],
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:flex-none',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export type IconButtonProps = Omit<ButtonProps, 'variant' | 'iconOnly'> & {
  variant?: 'ghost' | 'glass';
  /** Toggle-style pressed state (renders `aria-pressed`), per the prototype's `.icon-btn`. */
  pressed?: boolean;
};

/** IconButton (prototype `.icon-btn`): a bare square icon control, 32/36/44px. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', pressed, className, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      iconOnly
      aria-pressed={pressed}
      className={cn(pressed && 'bg-brand-subtle text-ink-primary', className)}
      {...props}
    />
  );
});
