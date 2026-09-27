/**
 * Pure geometry helpers for the static blueprint (T3.2): turning a
 * precomputed polyline route into SVG path data and finding the point to
 * anchor a link's label pill at. No layout is computed here — the route's
 * waypoints are taken as given.
 */
import type { XY } from '../types';

/** `[[x0,y0],[x1,y1],...]` → `"Mx0,y0 Lx1,y1 ..."`. Empty for a route with no points. */
export function routeToPath(route: readonly XY[]): string {
  if (route.length === 0) return '';
  const [first, ...rest] = route;
  let d = `M${first[0]},${first[1]}`;
  for (const [x, y] of rest) d += ` L${x},${y}`;
  return d;
}

/** The point half-way along the route by arc length (not by waypoint index), used to anchor a link's label pill. */
export function routeMidpoint(route: readonly XY[]): XY {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];

  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const [x0, y0] = route[i - 1];
    const [x1, y1] = route[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segments.push(len);
    total += len;
  }
  if (total === 0) return route[0];

  let remaining = total / 2;
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i];
    if (remaining <= len) {
      const [x0, y0] = route[i];
      const [x1, y1] = route[i + 1];
      const t = len === 0 ? 0 : remaining / len;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    remaining -= len;
  }
  return route[route.length - 1];
}

/** Offsets a point by a translation, for placing a nested (subsystem-local) route/box in the parent's coordinate space. */
export function translate([x, y]: XY, [dx, dy]: XY): XY {
  return [x + dx, y + dy];
}
