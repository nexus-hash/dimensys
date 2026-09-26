'use client';

import { useEffect, useState } from 'react';

/**
 * Honors both channels §3.5 requires motion to respect:
 *   1. the OS-level `prefers-reduced-motion` media query, and
 *   2. the app's own Motion setting, applied as `data-motion="off"` on
 *      `<html>` (see the player's future Motion: normal/calm/off control).
 *
 * Primitives use this to switch springs/slides for 120ms fades (or skip
 * animation entirely) per the reduced-motion rules in §3.5 and §9.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return readReducedMotion();
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(readReducedMotion());
    update();

    mql.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      mql.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const dataMotionOff = document.documentElement.getAttribute('data-motion') === 'off';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return dataMotionOff || prefersReduced;
}
