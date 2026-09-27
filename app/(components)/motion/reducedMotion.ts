/**
 * Reduced-motion plumbing for the motion module. Re-exports the existing
 * `useReducedMotion` hook (which already honors both `prefers-reduced-motion`
 * and the app's own `data-motion="off"` override) and adds the imperative
 * equivalents that non-React code (the spring/view-transition helpers, the
 * choreography presets) needs.
 */

import { useReducedMotion } from '@/app/(components)/ui/useReducedMotion';

export { useReducedMotion };

/** One-shot, non-reactive read of the same two signals `useReducedMotion` watches. */
export function isMotionReduced(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const dataMotionOff = document.documentElement.getAttribute('data-motion') === 'off';
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return dataMotionOff || prefersReduced;
}
