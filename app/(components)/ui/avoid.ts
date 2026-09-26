'use client';

import * as React from 'react';

export type AvoidTarget = { current: HTMLElement | null } | DOMRect | null | undefined;

function isDOMRect(target: unknown): target is DOMRect {
  return typeof DOMRect !== 'undefined' && target instanceof DOMRect;
}

function resolveRect(target: AvoidTarget): DOMRect | null {
  if (!target) return null;
  if (isDOMRect(target)) return target;
  return target.current ? target.current.getBoundingClientRect() : null;
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * §15.6: "nothing floats over the diagram" — transient, pointer-anchored UI
 * (tooltips, popovers, context menus) is the one exception, but it must never
 * cover the element it names as `avoid` (e.g. a selected canvas node).
 *
 * This computes a small extra translate offset, applied on top of Radix's
 * own collision-aware Popper placement, that nudges the floating content
 * clear of the avoided rect(s) if Radix's placement still overlaps them.
 */
export function useAvoidOffset(
  contentRef: React.RefObject<HTMLElement | null>,
  avoid: AvoidTarget | AvoidTarget[],
  active: boolean,
): { x: number; y: number } {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const avoidList = Array.isArray(avoid) ? avoid : [avoid];

  React.useLayoutEffect(() => {
    if (!active) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    const el = contentRef.current;
    if (!el) return;

    const recompute = () => {
      const rects = avoidList.map(resolveRect).filter((r): r is DOMRect => !!r);
      if (rects.length === 0) {
        setOffset((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
        return;
      }
      const own = el.getBoundingClientRect();
      const current = { left: own.left, right: own.right, top: own.top, bottom: own.bottom };
      let dx = 0;
      let dy = 0;
      for (const v of rects) {
        const test = { left: current.left + dx, right: current.right + dx, top: current.top + dy, bottom: current.bottom + dy } as DOMRect;
        if (!rectsOverlap(test, v)) continue;
        const gap = 8;
        const spaceBelow = window.innerHeight - v.bottom;
        const spaceAbove = v.top;
        if (spaceBelow >= test.bottom - test.top + gap) {
          dy += v.bottom + gap - test.top;
        } else if (spaceAbove >= test.bottom - test.top + gap) {
          dy += v.top - gap - test.bottom;
        } else {
          dx += v.right + gap - test.left;
        }
      }
      setOffset((prev) => (prev.x === dx && prev.y === dy ? prev : { x: dx, y: dy }));
    };

    recompute();
    const raf = requestAnimationFrame(recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...avoidList.map((a) => (isDOMRect(a) ? `${a.left},${a.top},${a.right},${a.bottom}` : a?.current))]);

  return offset;
}
