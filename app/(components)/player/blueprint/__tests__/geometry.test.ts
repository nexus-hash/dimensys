import { describe, it, expect } from 'vitest';
import { routeToPath, routeMidpoint } from '../geometry';

describe('routeToPath', () => {
  it('returns an empty string for an empty route', () => {
    expect(routeToPath([])).toBe('');
  });

  it('draws a single move for one point', () => {
    expect(routeToPath([[10, 20]])).toBe('M10,20');
  });

  it('draws a moveto followed by linetos for a polyline', () => {
    expect(
      routeToPath([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
    ).toBe('M0,0 L10,0 L10,10');
  });
});

describe('routeMidpoint', () => {
  it('returns the only point for a single-point route', () => {
    expect(routeMidpoint([[5, 5]])).toEqual([5, 5]);
  });

  it('finds the arc-length midpoint of a straight two-point route', () => {
    expect(routeMidpoint([[0, 0], [100, 0]])).toEqual([50, 0]);
  });

  it('finds the arc-length midpoint across an uneven polyline (not the middle waypoint)', () => {
    // Segment lengths 10 and 90 (total 100): the midpoint (50) lands 40 units into the second segment.
    const mid = routeMidpoint([[0, 0], [10, 0], [100, 0]]);
    expect(mid[0]).toBeCloseTo(50);
    expect(mid[1]).toBeCloseTo(0);
  });

  it('handles a zero-length route without dividing by zero', () => {
    expect(routeMidpoint([[3, 3], [3, 3]])).toEqual([3, 3]);
  });
});

describe('routeToPath (curves)', () => {
  it('draws a cubic chain as C segments through every third point', () => {
    expect(
      routeToPath(
        [
          [0, 0],
          [10, 0],
          [10, 20],
          [20, 20],
          [30, 20],
          [30, 40],
          [40, 40],
        ],
        true,
      ),
    ).toBe('M0,0 C10,0 10,20 20,20 C30,20 30,40 40,40');
  });

  it('falls back to a polyline for a malformed control-point count', () => {
    expect(routeToPath([[0, 0], [10, 0], [20, 0]], true)).toBe('M0,0 L10,0 L20,0');
  });
});
