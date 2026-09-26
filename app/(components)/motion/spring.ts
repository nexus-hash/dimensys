/**
 * A small, dependency-free spring physics utility. Pure TS, driven by
 * `requestAnimationFrame`, cancellable, and usable outside React (canvas
 * loops, imperative DOM updates) as well as inside it.
 *
 * Two named presets are exposed, matching the motion tokens read from CSS
 * (see `tokens.ts`): `spring-camera` (underdamped — a little overshoot, for
 * large/slow moves like camera pans) and `spring-ui` (near-critically-damped
 * — settles briskly with no visible overshoot, for small UI moves).
 */

import { springConfig, type SpringToken } from './tokens';

export interface SpringConfig {
  /** Spring stiffness (higher = snappier). */
  stiffness: number;
  /** Damping coefficient (higher = less overshoot). */
  damping: number;
  /** Mass of the animated value. Defaults to 1. */
  mass?: number;
  /** Velocity/displacement magnitude below which the spring is "settled". Defaults to 0.01. */
  precision?: number;
}

export interface SpringRunOptions {
  from: number;
  to: number;
  config: SpringConfig;
  /** Called every animation frame with the current value and velocity. */
  onUpdate: (value: number, velocity: number) => void;
  /** Called once the spring has settled at `to` (never called if cancelled). */
  onSettle?: () => void;
  /** Starting velocity. Defaults to 0. */
  initialVelocity?: number;
}

export interface SpringHandle {
  /** Stops the animation immediately. `onSettle` is not called. */
  cancel: () => void;
  /** Whether the spring is still running. */
  readonly running: boolean;
}

/** The critical damping coefficient for a given stiffness/mass (zero overshoot, fastest non-oscillating settle). */
export function criticalDamping(stiffness: number, mass = 1): number {
  return 2 * Math.sqrt(stiffness * mass);
}

const MAX_STEP_MS = 1000 / 30; // clamp large jank/tab-switch gaps to keep integration stable

/**
 * Runs a spring from `from` to `to`, calling `onUpdate` every frame with a
 * semi-implicit ("symplectic") Euler integration step — stable and cheap
 * enough for 60fps, and the same approach used by most JS spring libraries.
 */
export function animateSpring(options: SpringRunOptions): SpringHandle {
  const { from, to, config, onUpdate, onSettle, initialVelocity = 0 } = options;
  const mass = config.mass ?? 1;
  const precision = config.precision ?? 0.01;

  let value = from;
  let velocity = initialVelocity;
  let cancelled = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  const hasRaf = typeof requestAnimationFrame === 'function';

  function settled(): boolean {
    return Math.abs(to - value) < precision && Math.abs(velocity) < precision;
  }

  function step(now: number) {
    if (cancelled) return;
    if (lastTime === null) lastTime = now;
    const dtMs = Math.min(now - lastTime, MAX_STEP_MS);
    lastTime = now;
    const dt = dtMs / 1000;

    if (dt > 0) {
      const displacement = value - to;
      const springForce = -config.stiffness * displacement;
      const dampingForce = -config.damping * velocity;
      const acceleration = (springForce + dampingForce) / mass;
      velocity += acceleration * dt;
      value += velocity * dt;
    }

    if (settled()) {
      value = to;
      velocity = 0;
      onUpdate(value, velocity);
      handle.running = false;
      onSettle?.();
      return;
    }

    onUpdate(value, velocity);
    rafId = hasRaf ? requestAnimationFrame(step) : null;
  }

  const handle: SpringHandle & { running: boolean } = {
    running: true,
    cancel() {
      cancelled = true;
      handle.running = false;
      if (rafId !== null && hasRaf) cancelAnimationFrame(rafId);
    },
  };

  if (from === to && initialVelocity === 0) {
    // Already at rest — resolve on the next frame so callers can rely on
    // async completion either way.
    rafId = hasRaf
      ? requestAnimationFrame(() => {
          if (cancelled) return;
          onUpdate(to, 0);
          handle.running = false;
          onSettle?.();
        })
      : null;
    return handle;
  }

  rafId = hasRaf ? requestAnimationFrame(step) : null;
  return handle;
}

/** Builds a `SpringConfig` from one of the named CSS-token springs (`spring-camera` / `spring-ui`). */
export function springPreset(token: SpringToken, overrides?: Partial<SpringConfig>): SpringConfig {
  const { stiffness, damping } = springConfig(token);
  return { stiffness, damping, mass: 1, ...overrides };
}

/** Runs a spring using a named CSS-token preset directly. */
export function animateSpringPreset(
  token: SpringToken,
  options: Omit<SpringRunOptions, 'config'> & { config?: Partial<SpringConfig> },
): SpringHandle {
  return animateSpring({ ...options, config: springPreset(token, options.config) });
}
