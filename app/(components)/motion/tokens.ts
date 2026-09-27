/**
 * Motion tokens — read from the CSS custom properties defined in
 * `app/globals.css` (the `--transition-duration-*`, `--ease-*` and
 * `--spring-*-*` variables) rather than hard-coded in TypeScript.
 *
 * Reading `getComputedStyle(document.documentElement)` is the only way to
 * consume a CSS variable's value from JS, so every duration/easing/spring
 * constant here is a *fallback* — used during SSR, in tests (jsdom has no
 * real cascade) and if a variable is ever renamed without updating this
 * file — with the live value preferred whenever `window` exists.
 */

export type DurationToken = 'micro' | 'small' | 'panel' | 'scene';
export type EaseToken = 'standard' | 'emphasized' | 'exit';
export type SpringToken = 'camera' | 'ui';

/** Mirrors `app/globals.css` `@theme` — kept in sync manually, see module doc above. */
const DURATION_FALLBACK_MS: Record<DurationToken, number> = {
  micro: 120,
  small: 200,
  panel: 320,
  scene: 600,
};

export interface SpringTokenConfig {
  stiffness: number;
  damping: number;
}

const SPRING_FALLBACK: Record<SpringToken, SpringTokenConfig> = {
  camera: { stiffness: 170, damping: 26 },
  ui: { stiffness: 400, damping: 32 },
};

const DURATION_VAR: Record<DurationToken, string> = {
  micro: '--transition-duration-micro',
  small: '--transition-duration-small',
  panel: '--transition-duration-panel',
  scene: '--transition-duration-scene',
};

const EASE_VAR: Record<EaseToken, string> = {
  standard: '--ease-standard',
  emphasized: '--ease-emphasized',
  exit: '--ease-exit',
};

const SPRING_VAR: Record<SpringToken, { stiffness: string; damping: string }> = {
  camera: { stiffness: '--spring-camera-stiffness', damping: '--spring-camera-damping' },
  ui: { stiffness: '--spring-ui-stiffness', damping: '--spring-ui-damping' },
};

function readCssRaw(varName: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return value ? value.trim() : null;
}

/** Parses a CSS `<time>` value ("120ms" / "0.2s") to milliseconds. */
function parseMs(raw: string): number | null {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(raw);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  return match[2] === 's' ? value * 1000 : value;
}

function parseNumber(raw: string): number | null {
  const value = parseFloat(raw);
  return Number.isNaN(value) ? null : value;
}

/** Duration for a named token, in milliseconds. */
export function durationMs(token: DurationToken): number {
  const raw = readCssRaw(DURATION_VAR[token]);
  const parsed = raw ? parseMs(raw) : null;
  return parsed ?? DURATION_FALLBACK_MS[token];
}

/** `{ stiffness, damping }` for a named spring token. */
export function springConfig(token: SpringToken): SpringTokenConfig {
  const stiffnessRaw = readCssRaw(SPRING_VAR[token].stiffness);
  const dampingRaw = readCssRaw(SPRING_VAR[token].damping);
  const stiffness = stiffnessRaw ? parseNumber(stiffnessRaw) : null;
  const damping = dampingRaw ? parseNumber(dampingRaw) : null;
  return {
    stiffness: stiffness ?? SPRING_FALLBACK[token].stiffness,
    damping: damping ?? SPRING_FALLBACK[token].damping,
  };
}

/** `var(--ease-<token>)`, for use directly in inline styles/CSS. */
export function easeVar(token: EaseToken): string {
  return `var(${EASE_VAR[token]})`;
}
