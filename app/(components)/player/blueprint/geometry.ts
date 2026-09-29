/**
 * Pure geometry helpers for the static blueprint (T3.2): turning a
 * precomputed polyline route into SVG path data and finding the point to
 * anchor a link's label pill at. No layout is computed here — the route's
 * waypoints are taken as given.
 */
import type { XY } from '../types';

/**
 * A route → SVG path data. A polyline `[[x0,y0],[x1,y1],...]` becomes
 * `"Mx0,y0 Lx1,y1 ..."`; a curve (`curve: true`, 3n + 1 cubic control points)
 * becomes `"Mp0 Cc1 c2 p1 ..."`. A curve with a malformed point count is
 * drawn as its polyline rather than guessed at. Empty for no points.
 */
export function routeToPath(route: readonly XY[], curve = false): string {
  if (route.length === 0) return '';
  const [first, ...rest] = route;
  let d = `M${first[0]},${first[1]}`;
  if (curve && route.length >= 4 && (route.length - 1) % 3 === 0) {
    for (let i = 1; i < route.length; i += 3) {
      const [c1, c2, p] = [route[i], route[i + 1], route[i + 2]];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`;
    }
    return d;
  }
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
