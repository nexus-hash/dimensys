'use client';

import * as React from 'react';
import { useReducedMotion } from './reducedMotion';
import { effectiveDurationMs, getPreset } from './presets';

const NUMBER_ROLL_PRESET_ID = 'number-roll';

/**
 * A jump is "big" (worth animating) once it's at least a 10x change either
 * way, matching the guideline that ordinary ticks never snap visibly but
 * also never animate for their own sake — only a genuinely large jump does.
 */
export function isBigJump(from: number, to: number): boolean {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return false;
  if (from === 0) return to !== 0;
  const ratio = Math.abs(to / from);
  return ratio >= 10 || ratio <= 0.1;
}

/** Ease-out smoothstep — cheap, dependency-free, close enough to `--ease-standard` for a numeric tween. */
function smoothstep(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

const defaultFormat = (v: number) => Math.round(v).toLocaleString('en-US');

export interface NumberRollProps {
  /** The current numeric value. Formatting is the caller's responsibility (see `format`). */
  value: number;
  /** Renders a numeric value to display text. Defaults to a grouped integer. */
  format?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label, if the visible text alone isn't sufficient context. */
  ariaLabel?: string;
  /** Overrides the ambient reduced-motion state — used by the gallery's toggle and by tests. */
  reducedOverride?: boolean;
}

/**
 * Live-updating number with tabular digits. Small ticks update instantly (no
 * animation — with tabular figures, digits don't jitter, so there's nothing
 * to smooth); a jump of 10x or more rolls smoothly to the new value instead
 * of snapping. Under reduced motion (either signal), every change is
 * instant, matching the module's other spring-based presets.
 */
export function NumberRoll({ value, format = defaultFormat, className, style, ariaLabel, reducedOverride }: NumberRollProps) {
  const hookReduced = useReducedMotion();
  const reduced = reducedOverride ?? hookReduced;

  const [display, setDisplay] = React.useState(value);
  const prevValueRef = React.useRef(value);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (reduced || !isBigJump(from, to)) {
      setDisplay(to);
      return;
    }

    const preset = getPreset(NUMBER_ROLL_PRESET_ID);
    const rollDurationMs = preset ? effectiveDurationMs(preset, false) : 150;
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = rollDurationMs <= 0 ? 1 : elapsed / rollDurationMs;
      setDisplay(from + (to - from) * smoothstep(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, reduced]);

  const merged = className ? `tabular-nums ${className}` : 'tabular-nums';

  return (
    <span className={merged} style={style} aria-label={ariaLabel}>
      {format(display)}
    </span>
  );
}
