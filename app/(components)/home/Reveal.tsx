'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/app/(components)/ui';

/**
 * Scroll-reveal for the Home showcase sections (S4.6a). Content is fully
 * opaque and legible in every state — this only settles a translateY offset
 * into place, never hides anything, so a no-JS visitor, a reduced-motion
 * visitor and an automated a11y scan (contrast, `IntersectionObserver`
 * never having fired) all see fully-readable content regardless of scroll
 * position.
 *
 * Reduced motion (OS preference or the app's own Motion setting) skips the
 * observer entirely and renders already-settled.
 */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const id = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div ref={ref} className={`${reduced || visible ? 'home-reveal is-visible' : 'home-reveal'} ${className}`}>
      {children}
    </div>
  );
}
