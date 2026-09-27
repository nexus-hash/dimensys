/**
 * The static blueprint's color-by hook (the canvas kit's health-state ring
 * scheme is the visual contract's one fixed color scheme for nodes — see the
 * canvas kit's `HealthState`). `StaticBlueprint` takes a `mode` prop and a
 * per-id lookup so callers can drive that scheme without the component
 * needing to know where the values come from.
 *
 * Today only `'health'` exists: a static per-element state that defaults
 * every id to `ok` (the player always opens on the healthy baseline). The
 * type is a union of one member on purpose — it's the seam a later static
 * mode would extend, not a user-facing switch (that selection, if any ever
 * exists, belongs to the shell, not this renderer).
 */
import type { HealthState } from '@/app/(components)/canvas';

export type ColorByMode = 'health';

export interface ElementHealth {
  state: HealthState;
  /** Mono chip text shown under the element once it isn't `ok` (e.g. "p99 640 ms"). */
  label?: string;
}

/** Per-element static health, keyed by node/subsystem id. An id with no entry is `ok`. */
export type HealthLookup = Readonly<Record<string, ElementHealth>>;

export function resolveHealth(lookup: HealthLookup | undefined, id: string): ElementHealth {
  return lookup?.[id] ?? { state: 'ok' };
}
