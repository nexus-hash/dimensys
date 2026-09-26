'use client';

import * as React from 'react';
import { Slider as RadixSlider } from 'radix-ui';
import { cn } from './utils';
import { logBounds, positionToValue, valueToPosition } from './sliderScale';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  /** Internal-track step (in linear units for `scale="linear"`, in decades for `scale="log"`). */
  step?: number;
  /** `log` maps the track linearly in `log10(value)` space — useful for e.g. 1..10,000 rps. */
  scale?: 'linear' | 'log';
  disabled?: boolean;
  'aria-label'?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

/** Slider: 2px hairline track, ink fill/thumb. */
export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  scale = 'linear',
  disabled,
  formatValue,
  className,
  ...aria
}: SliderProps) {
  const bounds = scale === 'log' ? logBounds(min, max) : { min, max };
  const internalStep = scale === 'log' ? (bounds.max - bounds.min) / 100 : step;
  const position = valueToPosition(value, min, max, scale);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <RadixSlider.Root
        className="relative flex h-5 flex-1 touch-none select-none items-center"
        min={bounds.min}
        max={bounds.max}
        step={internalStep}
        disabled={disabled}
        value={[position]}
        onValueChange={([pos]) => onValueChange(positionToValue(pos, min, max, scale))}
        onValueCommit={([pos]) => onValueCommit?.(positionToValue(pos, min, max, scale))}
      >
        <RadixSlider.Track className="relative h-[2px] flex-1 rounded-full bg-line-hairline">
          <RadixSlider.Range className="absolute h-full rounded-full bg-ink-secondary" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-label={aria['aria-label']}
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-surface-overlay bg-ink-primary shadow-elevation-1',
            'transition-transform duration-micro hover:scale-110',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
            'disabled:opacity-45',
          )}
        />
      </RadixSlider.Root>
      {formatValue ? (
        <span className="w-16 flex-none text-right font-mono text-[12px] tabular-nums text-ink-muted">
          {formatValue(value)}
        </span>
      ) : null}
    </div>
  );
}
